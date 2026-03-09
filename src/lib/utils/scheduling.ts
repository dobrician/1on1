/**
 * Utility for computing the next session date based on cadence and preferences.
 */

const CADENCE_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
};

const DAY_MAP: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
};

/**
 * Compute the next session date given a reference date, cadence, and optional preferred day.
 *
 * Logic:
 * - weekly = +7 days
 * - biweekly = +14 days
 * - monthly = +1 calendar month
 * - custom = +cadenceCustomDays
 *
 * If preferredDay is set, the date is moved forward to the next occurrence
 * of that day (never backward).
 */
export function computeNextSessionDate(
  lastDate: Date,
  cadence: string,
  cadenceCustomDays: number | null,
  preferredDay: string | null,
  /** When true, finds the nearest upcoming preferred day rather than lastDate + cadence */
  firstSession = false
): Date {
  // For the first session, return the nearest upcoming preferred day (could be days away)
  if (firstSession && preferredDay && DAY_MAP[preferredDay] !== undefined) {
    const targetDay = DAY_MAP[preferredDay];
    const start = new Date(lastDate);
    start.setDate(start.getDate() + 1); // start from tomorrow
    const currentDay = start.getDay();
    const adjustedCurrent = currentDay === 0 ? 7 : currentDay;
    const diff = (targetDay - adjustedCurrent + 7) % 7;
    start.setDate(start.getDate() + diff);
    return start;
  }

  let next: Date;

  if (cadence === "monthly") {
    next = new Date(lastDate);
    next.setMonth(next.getMonth() + 1);
  } else if (cadence === "custom") {
    const days = cadenceCustomDays ?? 14;
    next = new Date(lastDate.getTime() + days * 24 * 60 * 60 * 1000);
  } else {
    const days = CADENCE_DAYS[cadence] ?? 7;
    next = new Date(lastDate.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // Align to preferred day if set (move forward, never backward)
  if (preferredDay && DAY_MAP[preferredDay] !== undefined) {
    const targetDay = DAY_MAP[preferredDay];
    const currentDay = next.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    // Convert Sunday (0) to 7 for easier math
    const adjustedCurrent = currentDay === 0 ? 7 : currentDay;
    const diff = targetDay - adjustedCurrent;

    if (diff !== 0) {
      // Move forward to the next occurrence of preferred day
      next.setDate(next.getDate() + ((diff + 7) % 7 || 7));
    }
  }

  return next;
}
