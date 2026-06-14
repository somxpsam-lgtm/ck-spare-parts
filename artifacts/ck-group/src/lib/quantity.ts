export function formatQuantity(quantity: number, unit?: string | null): string {
  const u = (unit ?? "").trim();
  return u ? `${quantity} ${u}` : `${quantity}`;
}

export const COMMON_UNITS = [
  "Pcs",
  "Piece",
  "Pieces",
  "Set",
  "Pair",
  "Dozen",
  "Box",
  "Packet",
  "Bag",
  "Roll",
  "Bottle",
  "Can",
  "Liter",
  "ml",
  "Kg",
  "Gram",
  "Meter",
  "cm",
  "Feet",
  "Sheet",
  "Unit",
];
