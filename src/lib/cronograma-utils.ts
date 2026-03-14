/**
 * Date calculation utilities for the Cronograma module.
 * Supports both business days (dias úteis) and calendar days (dias corridos).
 */

/** Check if a date falls on a weekend (Saturday or Sunday) */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Add N business days to a date (skipping weekends).
 * Does not yet account for holidays — holiday calendar can be added later.
 */
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      added++;
    }
  }
  return result;
}

/** Add N calendar days to a date */
export function addCalendarDays(start: Date, days: number): Date {
  const result = new Date(start);
  result.setDate(result.getDate() + days);
  return result;
}

/** Add days respecting count_type */
export function addDays(start: Date, days: number, countType: "uteis" | "corridos"): Date {
  if (days === 0) return new Date(start);
  return countType === "uteis"
    ? addBusinessDays(start, days)
    : addCalendarDays(start, days);
}

/** Parse a date string (yyyy-MM-dd) into a local Date at midnight */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

/** Format a Date to yyyy-MM-dd */
export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface SubetapaCalc {
  id: string;
  ordem: number;
  intervalo_dias: number;
  /** Latest revision's new delivery, or null */
  ultima_revisao_entrega: string | null;
}

/**
 * Recalculate delivery dates for a list of substages given a start date.
 * Returns an array of { id, data_entrega } in order.
 *
 * Logic:
 * - First substage: delivery = startDate + intervalo_dias
 *   (if intervalo_dias == 0, delivery = startDate)
 * - Subsequent: delivery = previous_delivery + intervalo_dias
 * - If a substage has a revision with a later date, use that as base for next.
 */
export function recalcSubetapas(
  subetapas: SubetapaCalc[],
  startDate: Date,
  countType: "uteis" | "corridos"
): { id: string; data_entrega: string }[] {
  const sorted = [...subetapas].sort((a, b) => a.ordem - b.ordem);
  const results: { id: string; data_entrega: string }[] = [];
  let cursor = new Date(startDate);

  for (const sub of sorted) {
    const delivery = addDays(cursor, sub.intervalo_dias, countType);
    // If there's a revision that pushed the date, use the revision date
    const effectiveDate = sub.ultima_revisao_entrega
      ? (() => {
          const rev = parseLocalDate(sub.ultima_revisao_entrega);
          return rev > delivery ? rev : delivery;
        })()
      : delivery;

    results.push({ id: sub.id, data_entrega: toDateString(effectiveDate) });
    cursor = new Date(effectiveDate);
  }

  return results;
}
