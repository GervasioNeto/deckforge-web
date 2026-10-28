/** n choose k as a float: exact enough for 60-card decks, and no BigInt needed. */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const smaller = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= smaller; i++) {
    result = (result * (n - smaller + i)) / i;
  }
  return result;
}

/** Chance that `draws` cards taken from `size` include none of the `hits` cards. */
export function chanceOfNone(size: number, hits: number, draws: number): number {
  if (draws >= size) return hits > 0 ? 0 : 1;
  return choose(size - hits, draws) / choose(size, draws);
}
