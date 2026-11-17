/** The highest price the server accepts, in cents (€999.99 would be a typo, not a coffee). */
const MAX_PRICE_CENTS = 99_999;

/**
 * A price the seller typed, in euros, as cents: "3,50" and "3.5" are 350. Finnish phones type
 * a comma, others a point; both work. Null for anything that isn't a price: empty, letters,
 * negative, more than two decimals, or €1000 and up.
 */
export function parsePriceInput(text: string): number | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '0').padEnd(2, '0'));
  return cents <= MAX_PRICE_CENTS ? cents : null;
}
