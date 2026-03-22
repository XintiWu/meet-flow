/**
 * 依共同空閒格子（"day-hour"）產生「更改會議時間推薦」排序：
 * 以目前選定時段為基準，優先列出「之後」的共同空閒，其餘再接上更早的時段。
 */
export function orderedCommonSlots(commonSlots: string[]): string[] {
  return [...commonSlots].sort((a, b) => {
    const [da, ha] = a.split("-").map(Number);
    const [db, hb] = b.split("-").map(Number);
    if (da !== db) return da - db;
    return ha - hb;
  });
}

function slotRank(s: string): number {
  const [d, h] = s.split("-").map(Number);
  return d * 100 + h;
}

/** 回傳最多 limit 個一小時建議（不含 currentMeetingSlot；若有則以其排序「下一個」空檔） */
export function rescheduleSuggestionSlots(
  commonSlots: string[],
  currentMeetingSlot: string | null,
  limit: number
): string[] {
  const sorted = orderedCommonSlots(commonSlots);
  const excluded = new Set<string>();
  if (currentMeetingSlot) excluded.add(currentMeetingSlot);

  const filtered = sorted.filter((s) => !excluded.has(s));
  if (!currentMeetingSlot || filtered.length === 0) {
    return filtered.slice(0, limit);
  }

  const cr = slotRank(currentMeetingSlot);
  const after = filtered.filter((s) => slotRank(s) > cr);
  const beforeOrEqual = filtered.filter((s) => slotRank(s) <= cr);
  return [...after, ...beforeOrEqual].slice(0, limit);
}
