/** Shared display time: Intl fixes a 24-hour clock; only History includes a date. */
const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
const localDate = (instant: Date) => `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, "0")}-${String(instant.getDate()).padStart(2, "0")}`;

export function formatTime(value: number | string, history = false): string {
  const instant = new Date(value);
  return `${history ? `${localDate(instant)} ` : ""}${clock.format(instant)}`;
}
