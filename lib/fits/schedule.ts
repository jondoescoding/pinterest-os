export function scheduledPinTimes(
  date: string,
  count: number,
  timezoneOffsetHours = -5,
): string[] {
  const presets: Record<number, string[]> = {
    1: ["09:00"],
    2: ["09:00", "15:30"],
    3: ["09:00", "12:30", "16:00"],
    4: ["09:00", "12:30", "16:00", "19:30"],
    5: ["08:30", "11:30", "14:30", "17:30", "20:00"],
  };
  const times = presets[Math.max(1, Math.min(count, 5))] ?? presets[3];
  const sign = timezoneOffsetHours <= 0 ? "-" : "+";
  const abs = Math.abs(timezoneOffsetHours).toString().padStart(2, "0");
  return times.map((time) => `${date}T${time}:00${sign}${abs}:00`);
}
