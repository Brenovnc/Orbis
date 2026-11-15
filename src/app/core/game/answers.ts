import { Place } from '../data/geo-data.models';
import { Target } from './targets';

export type AnswerMode = 'countries' | 'capitals';

/**
 * Normalizes an answer for comparison: no case, no accents, and only letters and digits, so
 * "São Tomé", "sao-tome" and "SAO TOME" are the same, and "E.U.A." equals "eua".
 */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** The main names (not aliases) of a place in both languages. */
function primaryNames(place: Place, mode: AnswerMode): string[] {
  return mode === 'countries'
    ? [place.name.pt, place.name.en]
    : place.capitals.flatMap((capital) => [capital.name.pt, capital.name.en]);
}

/** Every accepted way of writing the answer for a place, in both languages. */
export function answerNames(place: Place, mode: AnswerMode): string[] {
  if (mode === 'countries') {
    return [place.name.pt, place.name.en, ...place.aliases.pt, ...place.aliases.en];
  }
  return place.capitals.flatMap((capital) => [
    capital.name.pt,
    capital.name.en,
    ...capital.aliases.pt,
    ...capital.aliases.en,
  ]);
}

export interface AnswerIndex {
  /** Normalized answer → targets it names (several for repeated capital names like Kingston). */
  exact: Map<string, Target[]>;
  /** Normalized main name → its targets (aliases left out). */
  primary: Map<string, Target[]>;
}

export function buildIndex(targets: Target[], mode: AnswerMode): AnswerIndex {
  const exact = new Map<string, Target[]>();
  const primary = new Map<string, Target[]>();
  for (const target of targets) {
    for (const name of primaryNames(target.place, mode)) {
      const key = normalizeAnswer(name);
      primary.set(key, [...(primary.get(key) ?? []), target]);
    }
  }
  for (const target of targets) {
    for (const name of answerNames(target.place, mode)) {
      const key = normalizeAnswer(name);
      if (!key) continue;
      const list = exact.get(key) ?? [];
      if (!list.includes(target)) list.push(target);
      exact.set(key, list);
    }
  }
  return { exact, primary };
}

export type TypoTolerance = 0 | 1 | 2;

/** Edits allowed for an answer of this length: short names must be typed exactly. */
function allowedEdits(length: number, tolerance: TypoTolerance): number {
  if (tolerance === 0 || length < 5) return 0;
  return tolerance === 2 && length >= 9 ? 2 : 1;
}

/** Edit distance counting a swap of two neighbouring letters as one edit. */
export function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...new Array<number>(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

/**
 * The accepted answer the typo points to. Refuses (undefined) as soon as the typo is within
 * tolerance of two different places, even if one is closer: with similar names (Gâmbia /
 * Zâmbia, Áustria / Austrália) it is better to say "not found" than to guess.
 */
function fuzzyLookup(
  key: string,
  index: AnswerIndex,
  tolerance: TypoTolerance,
): Target[] | undefined {
  const lists: Target[][] = [];
  const places = new Set<string>();
  for (const [candidate, targets] of index.exact) {
    const max = allowedEdits(candidate.length, tolerance);
    if (max === 0 || Math.abs(candidate.length - key.length) > max) continue;
    if (editDistance(key, candidate) > max) continue;
    lists.push(targets);
    targets.forEach((target) => places.add(target.id));
  }
  if (lists.length === 0) return undefined;
  if (places.size === 1) return lists[0];
  // Several places are fine only when they share one written name (Kingston).
  return lists.length === 1 ? lists[0] : undefined;
}

/**
 * True when `key` is the start of the main name of another place not found yet ("Irã" →
 * "Iraque"). Only targets count: places that are not answers never make a name wait. Aliases of other places are left out on purpose ("Guiana" should not wait because Suriname
 * was once called "Guiana Holandesa"), except when the typed text is itself an alias: "Congo"
 * (a nickname) waits because of "Congo-Kinshasa".
 */
function startsAnotherName(
  key: string,
  matched: Target[],
  index: AnswerIndex,
  found: ReadonlySet<string>,
): boolean {
  const matchedIds = new Set(matched.map((target) => target.id));
  const isAlias = !matched.some((target) => index.primary.get(key)?.includes(target));
  for (const [candidate, targets] of isAlias ? index.exact : index.primary) {
    if (candidate.length <= key.length || !candidate.startsWith(key)) continue;
    if (targets.some((t) => !matchedIds.has(t.id) && !found.has(t.id))) return true;
  }
  return false;
}

export type MatchResult =
  | { kind: 'hit'; targets: Target[] }
  | { kind: 'duplicate'; targets: Target[] }
  /** Exact answer, but also the start of another place's name: needs Enter to count. */
  | { kind: 'pending'; targets: Target[] }
  | { kind: 'miss' };

/**
 * Compares what was typed with the targets. `hit` carries only targets not found yet;
 * `duplicate` means the answer is right but was already given.
 *
 * While typing (`fuzzy` off) only a whole, exact name or alias counts, and not even that when
 * it is also the start of another place's main name still to find ("Irã" while typing
 * "Iraque", "Guiné" while typing "Guiné-Bissau"): that waits for Enter. Enter (`fuzzy` on) accepts exact
 * answers and forgives small typos.
 */
export function matchAnswer(
  raw: string,
  index: AnswerIndex,
  found: ReadonlySet<string>,
  options: { fuzzy: boolean; tolerance: TypoTolerance },
): MatchResult {
  const key = normalizeAnswer(raw);
  if (!key) return { kind: 'miss' };
  const exact = index.exact.get(key);
  if (exact && !options.fuzzy && startsAnotherName(key, exact, index, found)) {
    return { kind: 'pending', targets: exact };
  }
  const candidates =
    exact ?? (options.fuzzy ? fuzzyLookup(key, index, options.tolerance) : undefined);
  if (!candidates) return { kind: 'miss' };
  const open = candidates.filter((target) => !found.has(target.id));
  return open.length > 0
    ? { kind: 'hit', targets: open }
    : { kind: 'duplicate', targets: candidates };
}
