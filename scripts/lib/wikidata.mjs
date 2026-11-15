import { cachedFetch } from './fetch.mjs';

const ENTITY = 'http://www.wikidata.org/entity/';

/** Runs a SPARQL query and returns rows as plain objects (entity URIs become Q-ids). */
export async function sparql(query) {
  const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query);
  const json = await cachedFetch(url, {
    init: { headers: { Accept: 'application/sparql-results+json' } },
  });
  return json.results.bindings.map((binding) =>
    Object.fromEntries(Object.entries(binding).map(([k, v]) => [k, v.value.replace(ENTITY, '')])),
  );
}

/**
 * Loads full entities (labels, aliases, claims) through the Wikidata API.
 * Small batches: big countries have huge entities and the API silently truncates large answers.
 */
export async function getEntities(ids) {
  const unique = [...new Set(ids)].sort();
  const result = {};
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10);
    const url =
      'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|aliases|claims' +
      '&languages=pt|pt-br|en|mul&ids=' +
      batch.join('|');
    const json = await cachedFetch(url);
    for (const [id, entity] of Object.entries(json.entities)) result[id] = entity;
  }
  const missing = unique.filter((id) => !result[id] || result[id].missing !== undefined);
  if (missing.length) throw new Error(`Wikidata não devolveu: ${missing.join(', ')}`);
  return result;
}

export function label(entity, langs) {
  for (const lang of langs) {
    const value = entity.labels?.[lang]?.value;
    if (value) return value;
  }
  return undefined;
}

export function aliases(entity, langs) {
  return langs.flatMap((lang) => (entity.aliases?.[lang] ?? []).map((a) => a.value));
}

/**
 * Current statements of a property: drops deprecated ones and those with an end date,
 * then keeps the preferred ones if any exist (the same idea as Wikidata's "best rank").
 */
export function currentClaims(entity, property, { bestOnly = true } = {}) {
  const claims = (entity.claims?.[property] ?? []).filter(
    (c) => c.rank !== 'deprecated' && !c.qualifiers?.P582 && c.mainsnak.snaktype === 'value',
  );
  if (!bestOnly) return claims;
  const preferred = claims.filter((c) => c.rank === 'preferred');
  return preferred.length > 0 ? preferred : claims;
}

export function claimValues(entity, property, options) {
  return currentClaims(entity, property, options).map((c) => {
    const value = c.mainsnak.datavalue.value;
    return typeof value === 'object' && value.id ? value.id : value;
  });
}

// Unit conversion factors to km² (exact definitions, not geographic data).
const AREA_UNITS = {
  Q712226: 1, // square kilometre
  Q25343: 1e-6, // square metre
  Q35852: 0.01, // hectare
  Q232291: 2.589988110336, // square mile
  Q81292: 0.0040468564224, // acre
};

/** Area in km² from P2046, or undefined. Prefers statements already in km². */
export function areaKm2(entity) {
  const values = currentClaims(entity, 'P2046')
    .map((c) => {
      const { amount, unit } = c.mainsnak.datavalue.value;
      const unitId = unit.replace(ENTITY, '');
      const factor = AREA_UNITS[unitId];
      return factor === undefined ? undefined : { km2: Number(amount) * factor, unitId };
    })
    .filter(Boolean);
  if (values.length === 0) return undefined;
  const inKm2 = values.filter((v) => v.unitId === 'Q712226');
  const pick = (inKm2.length > 0 ? inKm2 : values)[0];
  return Math.round(pick.km2 * 100) / 100;
}

/** Commons file name of P41 (flag image), or undefined. */
export function flagFile(entity) {
  return claimValues(entity, 'P41')[0];
}
