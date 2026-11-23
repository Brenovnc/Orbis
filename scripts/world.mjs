import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import mapshaper from 'mapshaper';
import { downloadCommonsFile } from './lib/commons.mjs';
import { cachedFetch } from './lib/fetch.mjs';
import { cleanAliases, normalize, removeAmbiguousAliases } from './lib/text.mjs';
import * as wd from './lib/wikidata.mjs';

const NE_VERSION = 'v5.1.2';
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_VERSION}/geojson`;
const FLAG_ICONS_DIR = 'node_modules/flag-icons/flags/4x3';

const CONTINENTS = {
  Africa: 'africa',
  Antarctica: 'antarctica',
  Asia: 'asia',
  Europe: 'europe',
  'North America': 'north-america',
  Oceania: 'oceania',
  'South America': 'south-america',
};
// Natural Earth puts some island states in "Seven seas (open ocean)"; for those we use its
// UN region field instead (only regions that map to a single continent).
const UN_REGIONS = { Africa: 'africa', Asia: 'asia', Europe: 'europe', Oceania: 'oceania' };

const validIso3 = (code) => /^[A-Z]{3}$/.test(code ?? '');
const validIso2 = (code) => /^[A-Z]{2}$/.test(code ?? '');

export async function buildWorld({ outDir, decisions, report }) {
  const mapUnits = await cachedFetch(`${NE_BASE}/ne_10m_admin_0_map_units.geojson`, {
    cacheKey: `ne-${NE_VERSION}-10m-map-units.json`,
  });
  const lakes = await cachedFetch(`${NE_BASE}/ne_110m_lakes.geojson`, {
    cacheKey: `ne-${NE_VERSION}-110m-lakes.json`,
  });

  // 1. The 195 countries: current UN members (Wikidata) + the two observer states.
  const members = await wd.sparql(`
    SELECT DISTINCT ?item WHERE {
      ?item p:P463 ?m . ?m ps:P463 wd:Q1065 .
      FILTER NOT EXISTS { ?m pq:P582 [] }
      FILTER NOT EXISTS { ?m wikibase:rank wikibase:DeprecatedRank }
    }`);
  const memberEntities = await wd.getEntities(members.map((r) => r.item));
  const countryQids = new Set();
  // When the game uses another item than the UN member (Kingdom of X → X), the ISO codes may
  // live only on the member item, so it is kept as a fallback source for them.
  const memberOf = new Map();
  for (const [qid, entity] of Object.entries(memberEntities)) {
    const override = decisions.unMemberItemOverrides[qid];
    if (override) {
      countryQids.add(override.useItem);
      memberOf.set(override.useItem, entity);
    }
    // Items without an ISO code here are former states that still carry the membership claim.
    else if (wd.claimValues(entity, 'P298').length > 0) countryQids.add(qid);
  }
  report.unMembers = countryQids.size;
  for (const qid of Object.keys(decisions.extraCountries)) countryQids.add(qid);

  const countryEntities = await wd.getEntities([...countryQids]);
  const isoCode = (qid, property) =>
    wd.claimValues(countryEntities[qid], property)[0] ??
    (memberOf.has(qid) ? wd.claimValues(memberOf.get(qid), property)[0] : undefined);
  const countryByIso3 = new Map();
  const iso3ByQid = new Map();
  for (const qid of countryQids) {
    const entity = countryEntities[qid];
    const iso3 = isoCode(qid, 'P298');
    if (!validIso3(iso3)) throw new Error(`País sem código ISO alfa-3 no Wikidata: ${qid}`);
    countryByIso3.set(iso3, { qid, entity });
    iso3ByQid.set(qid, iso3);
    if (memberOf.has(qid)) iso3ByQid.set(memberOf.get(qid).id, iso3);
  }

  // 2. Assign each Natural Earth map unit to a country and/or a territory.
  const homeIso3BySov = new Map();
  const unitCode = (p) => {
    const code = validIso3(p.ISO_A3) ? p.ISO_A3 : p.ADM0_A3;
    return decisions.naturalEarthCodeOverrides[code]?.code ?? code;
  };
  for (const { properties: p } of mapUnits.features) {
    if (p.HOMEPART === 1 && countryByIso3.has(unitCode(p)))
      homeIso3BySov.set(p.SOV_A3, unitCode(p));
  }

  const units = [];
  const usedDecisions = new Set();
  for (const feature of mapUnits.features) {
    const p = feature.properties;
    const code = unitCode(p);
    let country = null;
    let territory = null;
    if (countryByIso3.has(code)) {
      country = code;
    } else if (decisions.units[code]) {
      ({ country, territory } = decisions.units[code]);
      usedDecisions.add(code);
    } else if (validIso3(p.ISO_A3)) {
      territory = code;
      country = countryByIso3.has(p.ADM0_A3) ? p.ADM0_A3 : (homeIso3BySov.get(p.SOV_A3) ?? null);
    } else {
      throw new Error(
        `Unidade do Natural Earth sem regra: ${p.GU_A3} (${p.NAME}). Decida em scripts/decisions.json.`,
      );
    }
    units.push({ feature, p, code, country, territory });
  }
  const unusedDecisions = Object.keys(decisions.units).filter((k) => !usedDecisions.has(k));
  if (unusedDecisions.length)
    throw new Error(`Decisões sem unidade correspondente: ${unusedDecisions.join(', ')}`);

  // 3. Territories: one Wikidata item each (Natural Earth's own link, or by ISO code).
  const territoryUnits = Map.groupBy(
    units.filter((u) => u.territory),
    (u) => u.territory,
  );
  const territoryQid = new Map();
  for (const [id, list] of territoryUnits) {
    const qids = [...new Set(list.map((u) => u.p.WIKIDATAID))];
    if (qids.length === 1) {
      territoryQid.set(id, qids[0]);
    } else {
      const rows = await wd.sparql(`SELECT DISTINCT ?item WHERE { ?item wdt:P298 "${id}" }`);
      if (rows.length !== 1)
        throw new Error(`Não achei um item único do Wikidata para o território ${id}`);
      territoryQid.set(id, rows[0].item);
    }
  }
  const territoryEntities = await wd.getEntities([...territoryQid.values()]);

  // 4. Capitals of everything (labels and aliases come from the capital's own item).
  // All current capitals, not only the preferred one (Bolivia, South Africa...). The same city
  // can appear in several statements with different qualifiers, hence the Set.
  const capitalsOf = (entity) => [...new Set(wd.claimValues(entity, 'P36', { bestOnly: false }))];
  const allEntities = [...countryByIso3.values()]
    .map((c) => c.entity)
    .concat(Object.values(territoryEntities));
  const capitalEntities = await wd.getEntities(allEntities.flatMap(capitalsOf));

  const isoCodes = new Set();
  for (const { entity } of countryByIso3.values()) {
    for (const prop of ['P297', 'P298'])
      wd.claimValues(entity, prop).forEach((c) => isoCodes.add(c));
  }
  for (const entity of Object.values(territoryEntities)) {
    for (const prop of ['P297', 'P298'])
      wd.claimValues(entity, prop).forEach((c) => isoCodes.add(c));
  }

  const upperFirst = (s) => s && s.charAt(0).toUpperCase() + s.slice(1);

  // Areas that belong to no country and are never a target (Bir Tawil, the Spratly Islands...):
  // only their names, which the info card shows when one is clicked.
  const unplacedQid = new Map(
    units
      .filter((u) => !u.country && !u.territory)
      .map((u) => [u.code, decisions.unitWikidata[u.code]?.item ?? u.p.WIKIDATAID]),
  );
  checkAllUsed('unitWikidata', Object.keys(decisions.unitWikidata), (k) => unplacedQid.has(k));
  const unplacedEntities = await wd.getEntities([...unplacedQid.values()]);
  const unplaced = [...unplacedQid].map(([id, qid]) => {
    const entity = unplacedEntities[qid];
    const en = wd.label(entity, ['en', 'mul']);
    if (!en) throw new Error(`Área sem nome em inglês no Wikidata: ${id} (${qid})`);
    const pt = wd.label(entity, ['pt-br', 'pt', 'mul']) ?? en;
    return { id, wikidata: qid, name: { pt: upperFirst(pt), en: upperFirst(en) } };
  });

  // decisionKey: "BRA" for a place, "capital:BRA" for its capital(s).
  const names = (entity, what, { decisionKey, naturalEarthPt, naturalEarthEn } = {}) => {
    // "mul" is Wikidata's label for names written the same way in many languages.
    let en = wd.label(entity, ['en', 'mul']);
    if (!en) throw new Error(`${what} sem nome em inglês no Wikidata (${entity.id})`);
    let pt = wd.label(entity, ['pt-br', 'pt', 'mul']);
    if (!pt) {
      pt = en;
      report.ptFromEnglish.push(`${what}: "${en}" (${entity.id})`);
    }

    const choice = decisions.nameChoice[decisionKey];
    if (choice) {
      const sourced = new Set(
        [
          ...['pt-br', 'pt', 'en', 'mul'].map((l) => wd.label(entity, [l])),
          ...wd.aliases(entity, ['pt-br', 'pt', 'en']),
          naturalEarthPt,
          naturalEarthEn,
        ].filter(Boolean),
      );
      // A country with several capitals shares one key: each choice applies to the capital
      // whose sources contain it (checkAllUsed below catches choices that matched nothing).
      for (const [lang, value] of Object.entries(choice)) {
        if (!sourced.has(value)) continue;
        report.nameChoices.push(
          `${decisionKey} (${lang}): "${value}" (era "${lang === 'pt' ? pt : en}")`,
        );
        if (lang === 'pt') pt = value;
        else en = value;
      }
    }
    pt = upperFirst(pt);
    const otherPt = [wd.label(entity, ['pt-br']), wd.label(entity, ['pt']), naturalEarthPt];
    const blocked = decisions.aliasBlocklist[decisionKey] ?? [];
    const allowShort = decisions.shortAliasAllow.list;
    const aliasesPt = cleanAliases([...otherPt, ...wd.aliases(entity, ['pt-br', 'pt'])], {
      primaryNames: [pt, en],
      isoCodes,
      blocked,
      allowShort,
    });
    const aliasesEn = cleanAliases([wd.label(entity, ['en']), ...wd.aliases(entity, ['en'])], {
      primaryNames: [pt, en, ...aliasesPt],
      isoCodes,
      blocked,
      allowShort,
    });
    return { name: { pt, en }, aliases: { pt: aliasesPt, en: aliasesEn } };
  };

  const usedCapitalExclusions = new Set();
  const capitals = (entity, what) =>
    capitalsOf(entity)
      .filter((qid) => {
        const excluded = decisions.capitalExclude[what] ?? [];
        const en = wd.label(capitalEntities[qid], ['en', 'mul']);
        if (!excluded.includes(en)) return true;
        usedCapitalExclusions.add(`${what}:${en}`);
        return false;
      })
      .map((qid) => {
        const capital = capitalEntities[qid];
        return {
          wikidata: qid,
          ...names(capital, `Capital de ${what}`, { decisionKey: `capital:${what}` }),
        };
      });

  const continentOf = (unit, id) => {
    const override = decisions.continentOverrides[id]?.continent;
    if (override) {
      report.continentFallbacks.push(`${id}: "${unit.p.CONTINENT}" → ${override} (decisions.json)`);
      return override;
    }
    const continent = CONTINENTS[unit.p.CONTINENT] ?? UN_REGIONS[unit.p.REGION_UN];
    if (!continent)
      throw new Error(`Sem continente para ${id} (${unit.p.CONTINENT} / ${unit.p.REGION_UN})`);
    if (!CONTINENTS[unit.p.CONTINENT])
      report.continentFallbacks.push(`${id}: "${unit.p.CONTINENT}" → ${continent} (região da ONU)`);
    return continent;
  };

  // Claimants (P1336). A claimant that is not one of the 195 is mapped to its country (P17)
  // when it is part of one (e.g. a province); otherwise it is kept by name (e.g. a
  // self-proclaimed state).
  const claimantQidsOf = (entity) => wd.claimValues(entity, 'P1336', { bestOnly: false });
  const otherClaimants = await wd.getEntities(
    allEntities.flatMap(claimantQidsOf).filter((qid) => !iso3ByQid.has(qid)),
  );
  const claimedBy = (entity, ownerIso3) => {
    const result = new Map();
    for (const qid of claimantQidsOf(entity)) {
      const other = otherClaimants[qid];
      const viaCountry = other
        ? wd
            .claimValues(other, 'P17')
            .map((q) => iso3ByQid.get(q))
            .filter(Boolean)
        : [];
      const iso3 = iso3ByQid.get(qid) ?? (viaCountry.length === 1 ? viaCountry[0] : null);
      if (iso3 && iso3 !== ownerIso3) result.set(iso3, { country: iso3 });
      if (!iso3) {
        const pt = wd.label(other, ['pt-br', 'pt', 'mul']);
        const en = wd.label(other, ['en', 'mul']);
        result.set(qid, { country: null, name: { pt: upperFirst(pt ?? en), en } });
      }
    }
    return [...result.values()];
  };

  const labelPoint = (unit) => {
    const point = [unit.p.LABEL_X, unit.p.LABEL_Y].map((n) => Math.round(n * 1000) / 1000);
    if (!point.every(Number.isFinite)) throw new Error(`Sem ponto de rótulo: ${unit.p.GU_A3}`);
    return point;
  };

  // 5. Country records.
  const unitsByCountry = Map.groupBy(
    units.filter((u) => u.country && !u.territory),
    (u) => u.country,
  );
  const countries = [];
  for (const [iso3, { qid, entity }] of [...countryByIso3].sort()) {
    const list = unitsByCountry.get(iso3);
    if (!list) throw new Error(`País sem geometria no Natural Earth: ${iso3}`);
    // The unit coded like the country itself (not e.g. the Korean DMZ strip, also a "home part").
    const main =
      list.find((u) => u.p.HOMEPART === 1 && u.p.GU_A3 === iso3) ??
      list.find((u) => u.p.HOMEPART === 1) ??
      list[0];
    const iso2 = isoCode(qid, 'P297');
    if (!validIso2(iso2)) throw new Error(`País sem código ISO alfa-2: ${iso3}`);
    countries.push({
      id: iso3,
      iso2,
      wikidata: qid,
      ...names(entity, iso3, {
        decisionKey: iso3,
        naturalEarthPt: main.p.NAME_PT,
        naturalEarthEn: main.p.NAME_EN,
      }),
      capitals: capitals(entity, iso3),
      continent: continentOf(main, iso3),
      areaKm2: wd.areaKm2(entity) ?? null,
      claimedBy: claimedBy(entity, iso3),
      labelPoint: labelPoint(main),
    });
    const country = countries.at(-1);
    addEditorialAliases(country, decisions.editorialAliases[iso3]);
    if (decisions.countryNotes[iso3]) country.statusNote = pickLangs(decisions.countryNotes[iso3]);
  }

  // 6. Territory records.
  const territories = [];
  for (const [id, list] of [...territoryUnits].sort()) {
    const qid = territoryQid.get(id);
    const entity = territoryEntities[qid];
    const main = list[0];
    const iso2 = validIso2(main.p.ISO_A2) ? main.p.ISO_A2 : wd.claimValues(entity, 'P297')[0];
    territories.push({
      id,
      iso2: validIso2(iso2) ? iso2 : null,
      wikidata: qid,
      ...names(entity, id, {
        decisionKey: id,
        naturalEarthPt: list.length === 1 ? main.p.NAME_PT : undefined,
      }),
      capitals: capitals(entity, id),
      continent: continentOf(main, id),
      areaKm2: wd.areaKm2(entity) ?? null,
      administeredBy: main.country,
      claimedBy: claimedBy(entity, main.country),
      statusNote: decisions.territoryStatus[id] ? pickLangs(decisions.territoryStatus[id]) : null,
      targetNote: decisions.territoryStatus[id]?.target
        ? pickLangs(decisions.territoryStatus[id].target)
        : null,
      labelPoint: labelPoint(main),
    });
  }

  checkAllUsed('nameChoice', Object.keys(decisions.nameChoice), (k) =>
    report.nameChoices.some((c) => c.startsWith(`${k} (`)),
  );
  checkAllUsed(
    'capitalExclude',
    Object.entries(decisions.capitalExclude)
      .filter(([id]) => id !== '_leia')
      .flatMap(([id, list]) => list.map((n) => `${id}:${n}`)),
    (k) => usedCapitalExclusions.has(k),
  );
  checkAllUsed('territoryStatus', Object.keys(decisions.territoryStatus), (k) =>
    territories.some((t) => t.id === k),
  );
  const countryIds = new Set(countries.map((c) => c.id));
  for (const section of ['editorialAliases', 'countryNotes']) {
    checkAllUsed(section, Object.keys(decisions[section]), (k) => countryIds.has(k));
  }
  // Every country named in an error phrase needs its own wording (article and preposition).
  const phraseIds = new Set([
    ...territories.map((t) => t.administeredBy).filter(Boolean),
    ...decisions.countryParts.list.map((part) => part.country),
  ]);
  checkAllUsed('countryPhrases', [...phraseIds], (k) => decisions.countryPhrases[k]);
  checkAllUsed('countryPhrases', Object.keys(decisions.countryPhrases), (k) => phraseIds.has(k));
  for (const t of territories) {
    if (!t.administeredBy && !t.statusNote)
      throw new Error(`Território sem país administrador precisa de territoryStatus: ${t.id}`);
  }

  const countryName = new Map(countries.map((c) => [c.id, c.name]));
  for (const place of [...countries, ...territories]) {
    for (const claimant of place.claimedBy) {
      if (claimant.country) claimant.name = countryName.get(claimant.country);
    }
  }

  // 7. Two places with the same name (e.g. Saint-Martin and Sint Maarten are both
  // "São Martinho" in Portuguese): the territory gets its administering country in brackets.
  const places = [...countries, ...territories];
  for (const lang of ['pt', 'en']) {
    const groups = Map.groupBy(places, (x) => normalize(x.name[lang]));
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (const place of group) {
        if (!place.administeredBy) {
          if (countryByIso3.has(place.id)) continue;
          throw new Error(`Nome repetido sem país para desambiguar: ${place.id}`);
        }
        const before = place.name[lang];
        place.name[lang] = `${before} (${countryName.get(place.administeredBy)[lang]})`;
        report.disambiguated.push(`${place.id} (${lang}): "${before}" → "${place.name[lang]}"`);
      }
    }
  }

  // Typed country names must never be ambiguous, also with territories turned on. Capitals
  // are different on purpose: a repeated capital name (Kingston) counts for every place.
  const placeNames = removeAmbiguousAliases(places, (x) => ({
    primary: [x.name.pt, x.name.en],
    aliases: [...x.aliases.pt, ...x.aliases.en],
    aliasLists: [x.aliases.pt, x.aliases.en],
  }));
  const capitalCollisions = [
    ...Map.groupBy(
      places.flatMap((x) =>
        x.capitals.flatMap((c) => [c.name.pt, c.name.en].map((n) => [normalize(n), x.id])),
      ),
      ([key]) => key,
    ),
  ]
    .map(([key, rows]) => [key, [...new Set(rows.map(([, id]) => id))].sort()])
    .filter(([, ids]) => ids.length > 1);
  report.ambiguous = { placeNames, capitalCollisions };

  // 8. Flags: flag-icons (MIT) by ISO alpha-2; Wikimedia Commons as fallback, license checked.
  // The MIT license asks for its notice to travel with the copied files.
  copyFileSync(
    'node_modules/flag-icons/LICENSE',
    join(outDir, 'flags/world/LICENSE-flag-icons.txt'),
  );
  const flagAttributions = [];
  for (const place of places) {
    const code = (decisions.units[place.id]?.flagCode ?? place.iso2 ?? '').toLowerCase();
    const target = `flags/world/${place.id.toLowerCase()}.svg`;
    const source = join(FLAG_ICONS_DIR, `${code}.svg`);
    if (code && existsSync(source)) {
      copyFileSync(source, join(outDir, target));
      place.flag = target;
      continue;
    }
    const entity = countryEntities[place.wikidata] ?? territoryEntities[place.wikidata];
    const file = wd.flagFile(entity);
    if (!file) {
      place.flag = null;
      report.missingFlags.push(place.id);
      continue;
    }
    const { content, attribution } = await downloadCommonsFile(file);
    writeFileSync(join(outDir, target), content);
    place.flag = target;
    flagAttributions.push({ id: place.id, ...attribution });
  }

  // 9. Geometry: dissolve units that share country+territory, simplify, export TopoJSON.
  // Plain simplification erases small islands (Príncipe, the Comoros, atolls). So each island
  // becomes its own feature first; only negligible ones are dropped (< 100 km² and < 1% of
  // the place), and keep-shapes then protects every island that is left.
  const features = units.map(({ feature, code, country, territory }) => {
    const id = territory ?? country ?? code;
    return { type: 'Feature', geometry: feature.geometry, properties: { id, country, territory } };
  });
  const output = await mapshaper.applyCommands(
    [
      '-i units.json lakes.json combine-files',
      '-dissolve id copy-fields=country,territory target=units',
      '-each "TOTAL=this.area" target=units',
      '-explode target=units',
      '-filter "this.area >= 100e6 || this.area >= TOTAL * 0.01" target=units',
      '-simplify 5% keep-shapes target=*',
      '-dissolve id copy-fields=country,territory target=units',
      '-o world.topo.json format=topojson quantization=100000 id-field=id target=*',
    ].join(' '),
    {
      'units.json': JSON.stringify({ type: 'FeatureCollection', features }),
      'lakes.json': JSON.stringify({
        type: 'FeatureCollection',
        features: lakes.features.map((f) => ({
          type: 'Feature',
          geometry: f.geometry,
          properties: {},
        })),
      }),
    },
  );
  writeFileSync(join(outDir, 'world.topo.json'), output['world.topo.json']);

  report.world = {
    countries: countries.length,
    territories: territories.length,
    features: new Set(features.map((f) => f.properties.id)).size,
    neutral: [
      ...new Set(
        units.filter((u) => !u.country && !u.territory).map((u) => `${u.code} (${u.p.NAME})`),
      ),
    ],
    topoBytes: output['world.topo.json'].length,
  };
  const { _leia, ...countryPhrases } = decisions.countryPhrases;
  return {
    countries,
    territories,
    flagAttributions,
    nonTargets: { parts: decisions.countryParts.list, countryPhrases, unplaced },
  };
}

const pickLangs = ({ pt, en }) => ({ pt, en });

// Adds the editorial aliases (decisions.json) that are not already a name or alias of the place.
function addEditorialAliases(place, decision) {
  if (!decision) return;
  for (const lang of ['pt', 'en']) {
    const taken = new Set(
      [place.name.pt, place.name.en, ...place.aliases.pt, ...place.aliases.en].map(normalize),
    );
    for (const alias of decision.aliases[lang]) {
      if (taken.has(normalize(alias))) continue;
      place.aliases[lang].push(alias);
      taken.add(normalize(alias));
    }
  }
}

function checkAllUsed(section, keys, isUsed) {
  const unused = keys.filter((k) => k !== '_leia' && !isUsed(k));
  if (unused.length) throw new Error(`${section} sem item correspondente: ${unused.join(', ')}`);
}
