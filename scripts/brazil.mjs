import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import mapshaper from 'mapshaper';
import { optimize } from 'svgo';
import { downloadCommonsFile } from './lib/commons.mjs';
import { cachedFetch } from './lib/fetch.mjs';
import { cleanAliases, removeAmbiguousAliases } from './lib/text.mjs';
import * as wd from './lib/wikidata.mjs';

// Commons flags come straight from Inkscape and some weigh 300 KB. SVGO trims them to a few KB;
// rounding is harmless for a flag shown at most a few hundred pixels wide. Every flag ends up
// with a viewBox (some only have width and height) so the browser can scale it.
function optimizeFlag(content, sigla) {
  let svg = content.toString('utf8');
  const root = svg.match(/<svg\b[^>]*>/)?.[0];
  if (!root) throw new Error(`Bandeira ${sigla} não é um SVG`);
  if (!/\sviewBox=/.test(root)) {
    // Values may come as "1e3" or "600px"; parseFloat reads both (and gives NaN for "100%").
    const width = parseFloat(root.match(/\swidth="([^"]+)"/)?.[1]);
    const height = parseFloat(root.match(/\sheight="([^"]+)"/)?.[1]);
    if (!width || !height) throw new Error(`Bandeira ${sigla} sem tamanho nem viewBox`);
    svg = svg.replace(root, root.replace('<svg', `<svg viewBox="0 0 ${width} ${height}"`));
  }
  return optimize(svg, {
    multipass: true,
    // Heavy flags (coats of arms) can lose one more decimal without any visible change.
    floatPrecision: content.length > 50_000 ? 1 : 2,
    // Some flags scale a huge drawing by 0.000003; the default precision would round that to 0.
    plugins: [
      {
        name: 'preset-default',
        params: { overrides: { convertTransform: { transformPrecision: 10 } } },
      },
    ],
  }).data;
}

const IBGE = 'https://servicodados.ibge.gov.br/api';

export async function buildBrazil({ outDir, report }) {
  // IBGE: official names, abbreviations, regions, areas and the state boundaries.
  const ibgeStates = await cachedFetch(`${IBGE}/v1/localidades/estados?orderBy=nome`);
  const mesh = await cachedFetch(
    `${IBGE}/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=UF`,
  );

  // Wikidata: English names, capitals and flag files (matched by ISO 3166-2 code, e.g. BR-SP).
  const rows = await wd.sparql(`
    SELECT ?item ?iso WHERE { ?item wdt:P300 ?iso . FILTER(STRSTARTS(?iso, "BR-")) }`);
  const qidBySigla = new Map(rows.map((r) => [r.iso.slice(3), r.item]));
  const stateEntities = await wd.getEntities([...qidBySigla.values()]);

  const capitalQid = (entity) => {
    const values = wd.claimValues(entity, 'P36');
    if (values.length !== 1)
      throw new Error(`Estado ${entity.id} com ${values.length} capitais no Wikidata`);
    return values[0];
  };
  const regionQid = (entity) => wd.claimValues(entity, 'P361')[0];
  const linked = await wd.getEntities(
    Object.values(stateEntities).flatMap((e) => [capitalQid(e), regionQid(e)].filter(Boolean)),
  );

  const siglas = new Set(ibgeStates.map((s) => s.sigla));
  const states = [];
  const flagAttributions = [];
  const regionNamesEn = new Map();

  for (const ibge of ibgeStates) {
    const qid = qidBySigla.get(ibge.sigla);
    if (!qid) throw new Error(`Sem item do Wikidata para ${ibge.sigla}`);
    const entity = stateEntities[qid];

    const metadata = await cachedFetch(`${IBGE}/v3/malhas/estados/${ibge.id}/metadados`);
    const area = metadata[0]?.area;
    if (area?.unidade?.id !== 'km2') throw new Error(`Área do IBGE inesperada para ${ibge.sigla}`);

    const capital = linked[capitalQid(entity)];
    const region = linked[regionQid(entity)];
    if (region) regionNamesEn.set(ibge.regiao.sigla, wd.label(region, ['en']));

    const namePt = ibge.nome;
    const nameEn = wd.label(entity, ['en', 'mul']);
    const capitalPt = wd.label(capital, ['pt-br', 'pt', 'mul']);
    const capitalEn = wd.label(capital, ['en', 'mul']);
    if (!nameEn || !capitalPt || !capitalEn)
      throw new Error(`Nome faltando no Wikidata para ${ibge.sigla}`);
    const noCodes = { isoCodes: siglas };

    const flagFile = wd.flagFile(entity);
    if (!flagFile) throw new Error(`Sem bandeira no Wikidata para ${ibge.sigla}`);
    const { content, attribution } = await downloadCommonsFile(flagFile);
    const flag = `flags/br/${ibge.sigla.toLowerCase()}.svg`;
    writeFileSync(join(outDir, flag), optimizeFlag(content, ibge.sigla));
    flagAttributions.push({ id: ibge.sigla, ...attribution });

    states.push({
      id: ibge.sigla,
      ibgeCode: ibge.id,
      wikidata: qid,
      name: { pt: namePt, en: nameEn },
      aliases: {
        pt: cleanAliases(wd.aliases(entity, ['pt-br', 'pt']), {
          primaryNames: [namePt, nameEn],
          ...noCodes,
        }),
        en: cleanAliases(wd.aliases(entity, ['en']), {
          primaryNames: [namePt, nameEn],
          ...noCodes,
        }),
      },
      capitals: [
        {
          wikidata: capital.id,
          name: { pt: capitalPt, en: capitalEn },
          aliases: {
            pt: cleanAliases(wd.aliases(capital, ['pt-br', 'pt']), {
              primaryNames: [capitalPt, capitalEn],
              ...noCodes,
            }),
            en: cleanAliases(wd.aliases(capital, ['en']), {
              primaryNames: [capitalPt, capitalEn],
              ...noCodes,
            }),
          },
        },
      ],
      region: ibge.regiao.sigla,
      areaKm2: Number(area.dimensao),
      flag,
      labelPoint: [metadata[0].centroide.longitude, metadata[0].centroide.latitude],
    });
  }

  const ambiguousNames = removeAmbiguousAliases(states, (s) => ({
    primary: [s.name.pt, s.name.en],
    aliases: [...s.aliases.pt, ...s.aliases.en],
    aliasLists: [s.aliases.pt, s.aliases.en],
  }));
  // Capital aliases are kept even when repeated: a repeated capital name counts for every place.
  report.brazilAmbiguous = { ambiguousNames };

  const regions = [...new Map(ibgeStates.map((s) => [s.regiao.sigla, s.regiao])).values()]
    .sort((a, b) => a.id - b.id)
    .map((r) => {
      const en = regionNamesEn.get(r.sigla);
      if (!en) throw new Error(`Sem nome em inglês para a região ${r.nome}`);
      return { id: r.sigla, name: { pt: r.nome, en } };
    });

  // Geometry: IBGE identifies each state by its numeric code; the game uses the abbreviation.
  const siglaByCode = new Map(ibgeStates.map((s) => [String(s.id), s.sigla]));
  const features = mesh.features.map((f) => ({
    type: 'Feature',
    geometry: f.geometry,
    properties: { id: siglaByCode.get(String(f.properties.codarea)) },
  }));
  if (features.some((f) => !f.properties.id))
    throw new Error('Feição do IBGE sem UF correspondente');

  const output = await mapshaper.applyCommands(
    '-i states.json -simplify 25% keep-shapes -o brazil.topo.json format=topojson quantization=100000 id-field=id',
    { 'states.json': JSON.stringify({ type: 'FeatureCollection', features }) },
  );
  writeFileSync(join(outDir, 'brazil.topo.json'), output['brazil.topo.json']);
  report.brazil = {
    states: states.length,
    features: features.length,
    topoBytes: output['brazil.topo.json'].length,
  };

  return { states, regions, flagAttributions };
}
