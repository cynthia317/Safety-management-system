/** Shared due-soon/overdue thresholds for every module that has a `dueDate`
 * (Corrective Actions, Findings) or an equivalent target date (Inspections' `inspectionDate`)
 * — one place so the window is never hardcoded differently in two spots. */
export const DUE_SOON_WINDOW_DAYS = 3;

export function isOverdue(dueDate: Date, now: Date = new Date()): boolean {
  return dueDate.getTime() < now.getTime();
}

export function isDueSoon(dueDate: Date, now: Date = new Date()): boolean {
  if (isOverdue(dueDate, now)) return false;
  const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= DUE_SOON_WINDOW_DAYS;
}
