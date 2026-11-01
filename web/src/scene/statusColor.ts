/** Status ring colors: idle gray, working blue, done green, error red. */
export function statusRingColor(status: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("error") || s.includes("fail")) return "#ff5c5c";
  if (s.includes("done") || s.includes("complete") || s.includes("success")) return "#5dffa8";
  if (
    s.includes("work") ||
    s.includes("walk") ||
    s.includes("goto") ||
    s.includes("turbolift") ||
    s.includes("inspect") ||
    s.includes("update")
  ) {
    return "#4da3ff";
  }
  return "#9aa3ad";
}
