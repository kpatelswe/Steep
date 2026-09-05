export interface RankCandidate {
  id: string;
  source: string;
  publishedAt: Date;
  hasImage: boolean;
  clusterKey: string | null;
  clusterSize: number;
}

export interface RankOptions {
  now?: Date;
  /** Hours after which recency contributes nothing. */
  horizonHours?: number;
}

export function score(c: RankCandidate, now: Date, horizonHours: number): number {
  const ageHours = Math.max(0, (now.getTime() - c.publishedAt.getTime()) / 36e5);
  const recency = Math.max(0, 1 - ageHours / horizonHours);
  return 2 * Math.log(Math.max(1, c.clusterSize)) + recency + (c.hasImage ? 0.5 : 0);
}

/**
 * Pick the N stories for one topic block.
 *
 * 1. One representative per story cluster (the best-scoring member).
 * 2. Widely covered, fresh, illustrated stories score highest.
 * 3. At most one story per publisher while we can afford it, so a block
 *    never reads as "five things from The Verge".
 * 4. The lead (#1) is the best-scoring pick that has an image, if any.
 */
export function rankTopic<T extends RankCandidate>(candidates: T[], n: number, opts: RankOptions = {}): T[] {
  const now = opts.now ?? new Date();
  const horizon = opts.horizonHours ?? 24;
  if (n <= 0 || candidates.length === 0) return [];

  const scored = candidates.map((c) => ({ c, s: score(c, now, horizon) })).sort((a, b) => b.s - a.s);

  // one per cluster
  const seenClusters = new Set<string>();
  const deduped: typeof scored = [];
  for (const item of scored) {
    const key = item.c.clusterKey ?? `solo:${item.c.id}`;
    if (seenClusters.has(key)) continue;
    seenClusters.add(key);
    deduped.push(item);
  }

  // greedy pick with source diversity, then backfill
  const picked: typeof scored = [];
  const usedSources = new Set<string>();
  for (const item of deduped) {
    if (picked.length >= n) break;
    const src = item.c.source.toLowerCase();
    if (usedSources.has(src)) continue;
    usedSources.add(src);
    picked.push(item);
  }
  if (picked.length < n) {
    const pickedIds = new Set(picked.map((p) => p.c.id));
    for (const item of deduped) {
      if (picked.length >= n) break;
      if (!pickedIds.has(item.c.id)) picked.push(item);
    }
  }

  // promote the best illustrated story to lead
  const leadIdx = picked.findIndex((p) => p.c.hasImage);
  if (leadIdx > 0) {
    const [lead] = picked.splice(leadIdx, 1);
    picked.unshift(lead!);
  }
  return picked.map((p) => p.c);
}
