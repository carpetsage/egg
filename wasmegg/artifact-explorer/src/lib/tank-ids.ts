// Comma-separated encoding for the tank planner's target artifact id(s) in
// the `tank/:tankPlannerArtifactId/` route param. A single id serializes to
// exactly the same string as before (no trailing comma, no wrapping), so
// existing bookmarked single-artifact deep links keep resolving unchanged.

export function parseTankIds(param: string | undefined | null): string[] {
  if (!param) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const raw of param.split(',')) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function serializeTankIds(ids: string[]): string {
  return ids.join(',');
}
