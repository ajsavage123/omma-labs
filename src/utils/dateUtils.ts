/**
 * Safely parses a task's due_date (YYYY-MM-DD) and due_time (HH:mm) into a local JavaScript Date object.
 * Avoids browser timezone offset bugs caused by standard new Date("YYYY-MM-DD") (which parses as UTC midnight).
 */
export function getTaskDueDate(dueDateStr: string | null | undefined, dueTimeStr?: string | null): Date | null {
  if (!dueDateStr) return null;

  // Extract YYYY-MM-DD
  const cleanDateStr = dueDateStr.split('T')[0];
  const dateParts = cleanDateStr.split('-');
  
  if (dateParts.length !== 3) {
    const fallback = new Date(dueDateStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed in JS Date
  const day = parseInt(dateParts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  let hours = 0;
  let minutes = 0;

  if (dueTimeStr) {
    const timeParts = dueTimeStr.split(':');
    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    }
  }

  return new Date(year, month, day, isNaN(hours) ? 0 : hours, isNaN(minutes) ? 0 : minutes, 0, 0);
}
