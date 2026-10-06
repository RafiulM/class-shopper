import type { Criterion, UnderstoodDesire } from "@/lib/types"

export const normalizeText = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()

/** Criteria that will actually be sent to Jev: switched on and filled in. */
export const usedCriteria = (criteria: Criterion[]) => criteria.filter((c) => c.enabled && c.value.trim() !== "")

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Search keyword follows the criteria: phrases of switched-off criteria drop out. */
export function keywordFor(desire: UnderstoodDesire): string {
  let keyword = desire.keyword
  for (const c of desire.criteria) {
    if (!c.enabled && c.phrase) keyword = keyword.replace(new RegExp(`\\b${escapeRegExp(c.phrase)}\\b`, "i"), " ")
  }
  return keyword.replace(/\s+/g, " ").trim() || desire.keyword
}
