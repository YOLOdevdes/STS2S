export interface Keyword {
  id: string;        // e.g. "exhaust"
  label: string;     // e.g. "Exhaust"
  category: "mechanic" | "keyword" | "tag";
}

export interface Card {
  id: string;
  name: string;
  cost: number | "X" | null;
  type: "Attack" | "Skill" | "Power" | "Quest" | "Status" | "Curse";
  rarity: "Basic" | "Common" | "Uncommon" | "Rare" | "Special";
  description: string;
  upgraded_description: string;
  characters: string[];   // e.g. ["ironclad"] or ["colorless"] for shared/neutral cards
  tier: "S" | "A" | "B" | "C" | "D" | null;
  keywords: Keyword[];
  image_url: string;
}
