/** Loose form used only to compare names here (the game has its own, tested normalizer). */
export function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Keeps only aliases that are useful to type: plain words (no emoji, digits or brackets),
 * not a repeat of a primary name, and none of the noise Wikidata carries: sports and airport
 * codes ("GUI", "BAR", "CPH"), lowercase codes ("per", "sri"), subdivision codes ("FR-MF"),
 * abbreviations ("Ukr.", "I. Man") and other very short forms. Short acronyms people really
 * type ("EUA", "USA") are kept only when listed in `allowShort`.
 */
export function cleanAliases(
  candidates,
  { primaryNames, isoCodes, blocked = [], allowShort = [] },
) {
  const seen = new Set([...primaryNames, ...blocked].map(normalize));
  const allowed = new Set(allowShort.map((a) => a.replace(/\./g, '')));
  const result = [];
  for (const raw of candidates) {
    if (!raw) continue;
    // "the United States" adds nothing over "United States".
    const alias = raw.trim().replace(/^the\s+/i, '');
    const key = normalize(alias);
    if (seen.has(key)) continue;
    if (isNoise(alias, key, isoCodes, allowed)) continue;
    seen.add(key);
    result.push(alias);
  }
  return result;
}

function isNoise(alias, key, isoCodes, allowed) {
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(alias)) return true;
  if (allowed.has(alias.replace(/\./g, ''))) return false;
  const letters = key.replace(/ /g, '');
  if (letters.length <= 3) return true;
  // Subdivision codes: "FR-MF", "GB-GSY".
  if (/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(alias)) return true;
  const compact = alias.replace(/[.\s]/g, '');
  // All-caps short forms are codes or acronyms (DPRK, P.R.C., CABA, UNDOF...).
  if (compact === compact.toUpperCase() && compact.length <= 5) return true;
  if (isoCodes.has(alias.toUpperCase()) && alias === alias.toUpperCase()) return true;
  // Abbreviations: "Ukr.", "Lond.", "I. Man".
  if (/\p{L}{1,4}\.$/u.test(alias) || /^\p{L}\.\s/u.test(alias)) return true;
  return false;
}

/**
 * Removes aliases that point to more than one item (e.g. "Congo"), so a typed answer is
 * never ambiguous. Primary names are never removed; collisions between them are returned.
 */
export function removeAmbiguousAliases(items, getNames) {
  const owners = new Map();
  const add = (key, id) => owners.set(key, new Set([...(owners.get(key) ?? []), id]));
  for (const item of items) {
    const { primary, aliases } = getNames(item);
    for (const name of [...primary, ...aliases]) add(normalize(name), item.id);
  }

  const primaryOwners = new Map();
  for (const item of items) {
    for (const name of getNames(item).primary) {
      const key = normalize(name);
      primaryOwners.set(key, new Set([...(primaryOwners.get(key) ?? []), item.id]));
    }
  }
  const primaryCollisions = new Map(
    [...primaryOwners].filter(([, ids]) => ids.size > 1).map(([k, ids]) => [k, [...ids].sort()]),
  );

  const removed = [];
  for (const item of items) {
    const { aliasLists } = getNames(item);
    for (const list of aliasLists) {
      for (let i = list.length - 1; i >= 0; i--) {
        if (owners.get(normalize(list[i])).size > 1) {
          removed.push(`${item.id}: "${list[i]}"`);
          list.splice(i, 1);
        }
      }
    }
  }
  return { removed, primaryCollisions: [...primaryCollisions.entries()] };
}
