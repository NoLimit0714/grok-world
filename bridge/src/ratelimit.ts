/** Tiny in-memory rate limiter (per IP + route family). */
export function createRateLimiter(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; reset: number }>();

  return (key: string): boolean => {
    const now = Date.now();
    const row = hits.get(key);
    if (!row || now > row.reset) {
      hits.set(key, { count: 1, reset: now + opts.windowMs });
      return true;
    }
    row.count += 1;
    return row.count <= opts.max;
  };
}
