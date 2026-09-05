import { createHash } from "node:crypto";
import { jaccard } from "./normalize";

export interface ClusterInput {
  id: string;
  source: string;
  tokens: Set<string>;
}

export interface ClusterResult {
  clusterKey: string;
  clusterSize: number;
}

export const DEFAULT_SIMILARITY = 0.45;

/**
 * Group articles that are the same story reported by different publishers.
 *
 * Two items join a cluster when their headline tokens overlap enough (Jaccard)
 * AND they come from different sources: the same publisher covering a story twice
 * is not evidence that "everyone is covering this".
 */
export function clusterArticles(items: ClusterInput[], threshold = DEFAULT_SIMILARITY): Map<string, ClusterResult> {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // path compression
    let cur = x;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const it of items) parent.set(it.id, it.id);

  for (let i = 0; i < items.length; i++) {
    const a = items[i]!;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j]!;
      if (a.source.toLowerCase() === b.source.toLowerCase()) continue;
      if (jaccard(a.tokens, b.tokens) >= threshold) union(a.id, b.id);
    }
  }

  const members = new Map<string, string[]>();
  for (const it of items) {
    const root = find(it.id);
    const list = members.get(root) ?? [];
    list.push(it.id);
    members.set(root, list);
  }

  const result = new Map<string, ClusterResult>();
  for (const ids of members.values()) {
    ids.sort();
    const distinctSources = new Set(items.filter((i) => ids.includes(i.id)).map((i) => i.source.toLowerCase())).size;
    const clusterKey = createHash("sha1").update(ids.join("|")).digest("hex").slice(0, 16);
    for (const id of ids) result.set(id, { clusterKey, clusterSize: distinctSources });
  }
  return result;
}
