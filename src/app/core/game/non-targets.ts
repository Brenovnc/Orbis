import { CountryPart, LocalizedText, NonTargetsData, Territory } from '../data/geo-data.models';
import { normalizeAnswer } from './answers';

/** Why a typed name is a real place but not an answer. The page turns it into a message. */
export type Explanation =
  /** A territory with an administering country: "Greenland is a territory of Denmark". */
  | { kind: 'territory'; name: LocalizedText; country: LocalizedText }
  /** A part of a country: "England is part of the United Kingdom". */
  | { kind: 'part'; name: LocalizedText; country: LocalizedText }
  /** Not administered by any of the countries (Antarctica, Kosovo...). */
  | { kind: 'unlisted'; name: LocalizedText };

export interface NonTargetIndex {
  /** Normalized name or alias → why it is not an answer. */
  explanations: Map<string, Explanation>;
  /** Territory id (= its map shape id) → why it is not an answer, for clicks on the map. */
  byId: Map<string, Explanation>;
}

/**
 * Places the player can type that are not targets in this game: territories while they are
 * turned off, and the editorial list of country parts (England...). Territories that are
 * targets (`targetIds`) are left out, so nothing a player may answer is ever explained away.
 */
export function buildNonTargetIndex(
  territories: Territory[],
  data: NonTargetsData,
  targetIds: ReadonlySet<string>,
): NonTargetIndex {
  const explanations = new Map<string, Explanation>();
  const byId = new Map<string, Explanation>();
  const add = (texts: string[], explanation: Explanation) => {
    for (const text of texts) {
      const key = normalizeAnswer(text);
      if (key && !explanations.has(key)) explanations.set(key, explanation);
    }
  };

  for (const part of data.parts) {
    const country = data.countryPhrases[part.country];
    add(partNames(part), { kind: 'part', name: part.name, country });
  }
  for (const territory of territories) {
    if (targetIds.has(territory.id)) continue;
    const country = territory.administeredBy && data.countryPhrases[territory.administeredBy];
    const explanation: Explanation = country
      ? { kind: 'territory', name: territory.name, country }
      : { kind: 'unlisted', name: territory.name };
    byId.set(territory.id, explanation);
    add(
      [territory.name.pt, territory.name.en, ...territory.aliases.pt, ...territory.aliases.en],
      explanation,
    );
  }
  return { explanations, byId };
}

const partNames = (part: CountryPart) => [
  part.name.pt,
  part.name.en,
  ...part.aliases.pt,
  ...part.aliases.en,
];

/**
 * The territory and its country as the click-game messages write them ("Groenlândia" and
 * "da Dinamarca"), in the language `name` picks. Empty country when its wording is missing.
 */
export function territoryWords(
  territory: Territory,
  data: NonTargetsData | null,
  name: (text: LocalizedText) => string,
): { territory: string; country: string } {
  const phrase = data?.countryPhrases[territory.administeredBy ?? ''];
  return { territory: name(territory.name), country: phrase ? name(phrase) : '' };
}

/** The explanation for a typed text, or null when it is not a known non-target. */
export function explainNonTarget(raw: string, index: NonTargetIndex): Explanation | null {
  return index.explanations.get(normalizeAnswer(raw)) ?? null;
}
