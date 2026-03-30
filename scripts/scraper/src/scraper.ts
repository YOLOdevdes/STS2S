/**
 * STS2 Card Scraper — Direct GraphQL POST path
 *
 * DATA ACQUISITION DECISION: Direct GraphQL POST
 * The Mobalytics GraphQL endpoint at https://mobalytics.gg/api/sts2/v1/graphql/query
 * accepts unauthenticated POST requests using the sts2 game root query structure.
 * No Playwright, no auth, no Turnstile issues.
 *
 * Query structure discovered via Playwright network interception on 2026-03-30:
 *   game: sts2 { staticData { groups { cards(filter: {page: {all: true}, status: ACTIVE}) { data { ... } } } } }
 *
 * FALLBACK: If the GraphQL endpoint becomes unavailable or returns < 400 cards,
 * this scraper will exit with code 1 and print a clear error. The existing
 * cards.json is never overwritten with bad data.
 *
 * CARD PAIRING: The API returns base and upgraded variants separately.
 * Base cards have id "card-id", upgraded cards have id "card-id-plus".
 * We pair them by name to get both description and upgraded_description.
 *
 * COLORLESS CARDS: Cards with character.id === "colorless" (or character === null)
 * are represented as characters: ["colorless"] — clean for pool queries:
 *   filter(c => c.characters.includes(selectedChar) || c.characters.includes("colorless"))
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { validateCards } from "./validate.js";
import type { Card, Keyword } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../../../public/cards.json");
const ENDPOINT = "https://mobalytics.gg/api/sts2/v1/graphql/query";

// Full query requesting all fields needed for the Card schema
const FULL_QUERY = `query Sts2StaticDataFull {
  game: sts2 {
    staticData {
      groups {
        cards(filter: {page: {all: true}, status: ACTIVE}) {
          data {
            character {
              id
              name
              slug
            }
            deprecated
            description
            energy
            iconUrl
            id
            name
            rarity
            tags
            tier
            type
            variant
          }
        }
        keywords(filter: {page: {all: true}, status: ACTIVE}) {
          data {
            id
            name
            slug
            description
          }
        }
      }
    }
  }
}`;

// Raw card shape from the API
interface RawCard {
  character: { id: string; name: string; slug: string } | null;
  deprecated: boolean;
  description: string;
  energy: string;
  iconUrl: string;
  id: string;
  name: string;
  rarity: string;
  tags: string[];
  tier: string | null;
  type: string;
  variant: "base" | "upgraded";
}

interface RawKeyword {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface ApiResponse {
  data: {
    game: {
      staticData: {
        groups: {
          cards: { data: RawCard[] };
          keywords: { data: RawKeyword[] };
        };
      };
    };
  };
  errors?: Array<{ message: string }>;
}

// Map API energy string to Card cost type
function mapCost(energy: string): number | "X" | null {
  if (energy === "X") return "X";
  if (energy === "N/A" || energy === "" || energy === "null") return null;
  const n = parseInt(energy, 10);
  if (!isNaN(n)) return n;
  return null;
}

// Capitalize first letter of card type
function mapType(type: string): Card["type"] {
  const normalized = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  const validTypes = ["Attack", "Skill", "Power", "Quest", "Status", "Curse"] as const;
  if (validTypes.includes(normalized as Card["type"])) {
    return normalized as Card["type"];
  }
  // Fallback: treat unknowns as Skill (shouldn't happen with known data)
  console.warn(`  Warning: unknown card type "${type}", treating as Skill`);
  return "Skill";
}

// Map rarity string to Card rarity type
function mapRarity(rarity: string): Card["rarity"] {
  const validRarities: Record<string, Card["rarity"]> = {
    Basic: "Basic",
    Common: "Common",
    Uncommon: "Uncommon",
    Rare: "Rare",
    // Extended rarities present in the data — map to closest equivalent
    Ancient: "Special",  // Ancient = Special tier in-game
    Token: "Special",    // Token cards (Shivs, etc.)
    Event: "Special",    // Event reward cards
    Quest: "Special",    // Quest reward cards
    Curse: "Special",    // Curse cards (rarity field = "Curse")
    Status: "Special",   // Status cards
  };
  return validRarities[rarity] ?? "Common";
}

// Map tier string to Card tier letter
function mapTier(tier: string | null): Card["tier"] {
  if (!tier) return null;
  const match = tier.match(/^([SABCD])-Tier$/);
  if (match) return match[1] as Card["tier"];
  return null;
}

// Map character to characters array
function mapCharacters(character: RawCard["character"]): string[] {
  if (!character || character.id === "colorless") {
    return ["colorless"];
  }
  return [character.id];
}

// Map tags to Keyword objects
// Tags in this dataset are mechanic/archetype labels (e.g. "Exhaust", "Shiv", "Doom")
// We classify them as:
// - "mechanic" for well-known game mechanics (Exhaust, Ethereal, etc.)
// - "keyword" for character-specific or combat keywords
// - "tag" for archetype/theme tags (Shiv, Doom, etc.)
const KNOWN_MECHANICS = new Set([
  "Exhaust", "Ethereal", "Retain", "Innate", "Unplayable",
  "Fragile", "Echo", "Consume",
]);

function mapTags(tags: string[]): Keyword[] {
  return tags.map((tag) => ({
    id: tag.toLowerCase().replace(/\s+/g, "-"),
    label: tag,
    category: KNOWN_MECHANICS.has(tag) ? "mechanic" : "tag",
  }));
}

async function fetchCards(): Promise<{ cards: RawCard[]; keywords: RawKeyword[] }> {
  console.log(`Fetching card data from ${ENDPOINT}...`);

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ query: FULL_QUERY, variables: {} }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from GraphQL endpoint — aborting`);
  }

  const text = await response.text();

  let parsed: ApiResponse;
  try {
    parsed = JSON.parse(text) as ApiResponse;
  } catch {
    throw new Error(`GraphQL response is not valid JSON — possible Cloudflare challenge. First 200 chars: ${text.slice(0, 200)}`);
  }

  if (parsed.errors && parsed.errors.length > 0) {
    throw new Error(`GraphQL errors: ${parsed.errors.map((e) => e.message).join(", ")}`);
  }

  const cards = parsed.data?.game?.staticData?.groups?.cards?.data;
  const keywords = parsed.data?.game?.staticData?.groups?.keywords?.data;

  if (!cards || !Array.isArray(cards)) {
    throw new Error("GraphQL response missing cards data — unexpected schema change");
  }

  return { cards, keywords: keywords ?? [] };
}

function buildCardMap(rawCards: RawCard[]): Card[] {
  // Separate base and upgraded variants
  const baseCards = rawCards.filter((c) => c.variant === "base" && !c.deprecated);
  const upgradedCards = rawCards.filter((c) => c.variant === "upgraded" && !c.deprecated);

  // Build a lookup map: base card id → upgraded card description
  // Upgraded cards have id pattern "{base-id}-plus"
  const upgradedByBaseId = new Map<string, RawCard>();
  for (const upgCard of upgradedCards) {
    // Remove the "-plus" suffix to get the base card id
    if (upgCard.id.endsWith("-plus")) {
      const baseId = upgCard.id.slice(0, -5);
      upgradedByBaseId.set(baseId, upgCard);
    }
  }

  const mappedCards: Card[] = [];

  for (const raw of baseCards) {
    const upgradeVariant = upgradedByBaseId.get(raw.id);

    mappedCards.push({
      id: raw.id,
      name: raw.name,
      cost: mapCost(raw.energy),
      type: mapType(raw.type),
      rarity: mapRarity(raw.rarity),
      description: raw.description,
      upgraded_description: upgradeVariant?.description ?? raw.description,
      characters: mapCharacters(raw.character),
      tier: mapTier(raw.tier),
      keywords: mapTags(raw.tags),
      image_url: raw.iconUrl,
    });
  }

  return mappedCards;
}

async function scrape(): Promise<void> {
  console.log("STS2 Card Scraper — starting");
  console.log("Strategy: Direct GraphQL POST to Mobalytics API");
  console.log("---");

  let rawCards: RawCard[];
  let rawKeywords: RawKeyword[];

  try {
    const result = await fetchCards();
    rawCards = result.cards;
    rawKeywords = result.keywords;
  } catch (err) {
    console.error("FETCH FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log(`Fetched ${rawCards.length} raw card entries (base + upgraded variants)`);
  console.log(`Fetched ${rawKeywords.length} keywords`);

  const baseCount = rawCards.filter((c) => c.variant === "base" && !c.deprecated).length;
  const upgradedCount = rawCards.filter((c) => c.variant === "upgraded" && !c.deprecated).length;
  console.log(`  Base variants: ${baseCount}`);
  console.log(`  Upgraded variants: ${upgradedCount}`);

  // Map raw cards to Card schema
  const mappedCards = buildCardMap(rawCards);

  const colorlessCount = mappedCards.filter((c) => c.characters.includes("colorless")).length;
  console.log(`---`);
  console.log(`Mapped ${mappedCards.length} cards`);
  console.log(`  Colorless cards: ${colorlessCount}`);

  // Log character distribution
  const charCounts: Record<string, number> = {};
  for (const card of mappedCards) {
    for (const char of card.characters) {
      charCounts[char] = (charCounts[char] ?? 0) + 1;
    }
  }
  console.log("  Character distribution:", charCounts);

  // Validate before writing
  console.log("---");
  console.log("Validating cards...");

  let validatedCards: Card[];
  try {
    validatedCards = validateCards(mappedCards as unknown[]);
    console.log(`Validation PASSED — ${validatedCards.length} cards`);
  } catch (err) {
    console.error("VALIDATION FAILED:", err instanceof Error ? err.message : err);
    console.error("cards.json NOT written — fix the scraper before proceeding");
    process.exit(1);
  }

  // Write validated cards
  const json = JSON.stringify(validatedCards, null, 2);
  writeFileSync(OUTPUT_PATH, json, "utf8");

  console.log("---");
  console.log(`Wrote ${validatedCards.length} cards to public/cards.json`);
  console.log(`File size: ${(json.length / 1024).toFixed(1)} KB`);
}

scrape();
