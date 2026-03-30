/**
 * Output validation for the STS2 scraper.
 * Asserts card count and required fields before any file write.
 * Never returns partial data — throws on any failure.
 */

import type { Card } from "./types.js";

const VALID_TYPES = new Set(["Attack", "Skill", "Power", "Quest", "Status", "Curse"]);
const VALID_RARITIES = new Set(["Basic", "Common", "Uncommon", "Rare", "Special"]);
const VALID_TIERS = new Set(["S", "A", "B", "C", "D", null]);
const VALID_COSTS = new Set(["X"]);
const MIN_CARD_COUNT = 400;

function isValidCost(cost: unknown): cost is number | "X" | null {
  if (cost === null) return true;
  if (cost === "X") return true;
  if (typeof cost === "number" && !isNaN(cost)) return true;
  return false;
}

/**
 * Validates an array of raw card objects, returning typed Card[] on success.
 * Throws with a clear error message if any assertion fails.
 */
export function validateCards(cards: unknown[]): Card[] {
  // Count check
  if (cards.length < MIN_CARD_COUNT) {
    throw new Error(
      `Card count ${cards.length} below threshold ${MIN_CARD_COUNT} — aborting write`
    );
  }

  const failingCards: { index: number; card: unknown; reasons: string[] }[] = [];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i] as Record<string, unknown>;
    const reasons: string[] = [];

    // Required string fields — must be non-empty strings
    if (!card.id || typeof card.id !== "string") {
      reasons.push("missing or empty id");
    }
    if (!card.name || typeof card.name !== "string") {
      reasons.push("missing or empty name");
    }
    if (typeof card.description !== "string" || card.description.length === 0) {
      reasons.push("missing or empty description");
    }
    if (typeof card.upgraded_description !== "string") {
      // upgraded_description can be empty string (some cards have no upgrade) but must exist
      reasons.push("missing upgraded_description field");
    }
    if (!card.image_url || typeof card.image_url !== "string") {
      reasons.push("missing or empty image_url");
    }

    // characters: must be non-empty array
    if (!Array.isArray(card.characters) || card.characters.length === 0) {
      reasons.push("characters must be a non-empty array");
    }

    // cost: must be number, "X", or null — not undefined
    if (!("cost" in card)) {
      reasons.push("cost field is undefined (must be number, 'X', or null)");
    } else if (!isValidCost(card.cost)) {
      reasons.push(`invalid cost value: ${JSON.stringify(card.cost)}`);
    }

    // type: must be one of the known values
    if (!VALID_TYPES.has(card.type as string)) {
      reasons.push(`invalid type: ${JSON.stringify(card.type)} (valid: ${[...VALID_TYPES].join(", ")})`);
    }

    // rarity: must be one of the known values
    if (!VALID_RARITIES.has(card.rarity as string)) {
      reasons.push(`invalid rarity: ${JSON.stringify(card.rarity)} (valid: ${[...VALID_RARITIES].join(", ")})`);
    }

    // tier: must be one of the valid values or null
    if (!VALID_TIERS.has(card.tier as string | null)) {
      reasons.push(`invalid tier: ${JSON.stringify(card.tier)}`);
    }

    // keywords: must be an array
    if (!Array.isArray(card.keywords)) {
      reasons.push("keywords must be an array");
    }

    if (reasons.length > 0) {
      failingCards.push({ index: i, card, reasons });
    }
  }

  if (failingCards.length > 0) {
    const sample = failingCards.slice(0, 3);
    const details = sample
      .map(
        (f) =>
          `  Card[${f.index}] ${JSON.stringify((f.card as Record<string, unknown>).id ?? f.card)}: ${f.reasons.join("; ")}`
      )
      .join("\n");
    throw new Error(
      `${failingCards.length} card(s) failed validation:\n${details}${
        failingCards.length > 3 ? `\n  ... and ${failingCards.length - 3} more` : ""
      }`
    );
  }

  return cards as Card[];
}
