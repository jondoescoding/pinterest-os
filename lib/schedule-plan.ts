export type ScheduleUnit = "minutes" | "hours" | "days";

export interface SchedulePlanInput {
  startMs: number;
  interval: number;
  unit: ScheduleUnit;
  count: number;
}

function addMonthsSafe(date: Date, months: number): Date {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

export function addScheduleInterval(
  startMs: number,
  index: number,
  interval: number,
  unit: ScheduleUnit,
): number {
  const safeInterval = Math.max(1, Math.floor(interval));
  if (unit === "minutes") return startMs + index * safeInterval * 60_000;
  if (unit === "hours") return startMs + index * safeInterval * 60 * 60_000;

  const start = new Date(startMs);
  const next = addMonthsSafe(start, 0);
  next.setDate(start.getDate() + index * safeInterval);
  return next.getTime();
}

export function buildSchedulePlan({
  startMs,
  interval,
  unit,
  count,
}: SchedulePlanInput): number[] {
  return Array.from({ length: count }, (_value, index) =>
    addScheduleInterval(startMs, index, interval, unit),
  );
}
