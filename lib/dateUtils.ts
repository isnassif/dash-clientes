export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Formats a Date as YYYY-MM-DD using local time (no timezone shifting). */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns a 6x7 grid of Date objects representing the calendar weeks (Mon-Sun) for the given month. */
export function getMonthGrid(year: number, month: number): Date[] {
  // month is 1-12
  const firstOfMonth = new Date(year, month - 1, 1);
  // getDay(): 0=Sun..6=Sat -> convert to Monday-first index 0=Mon..6=Sun
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  const gridStart = new Date(year, month - 1, 1 - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
