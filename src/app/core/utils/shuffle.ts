/** Fisher–Yates with crypto randomness, so sample hands aren't biased. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  const random = new Uint32Array(result.length);
  crypto.getRandomValues(random);
  for (let i = result.length - 1; i > 0; i--) {
    const j = random[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
