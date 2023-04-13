export const DAYS_IN_A_WEEK = 7;
export const mod = (a, b) => ((a % b) + b) % b;

/// Returns the number of days in the given month.
export function getDaysInMonth (year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/// Returns the first weekday normalized to the weekStart day.
export function getFirstWeekdayNormalized (year, month, weekStart) {
    const firstWeekday = new Date(year, month).getDay();
    return mod(firstWeekday - weekStart, DAYS_IN_A_WEEK);
}

/// Returns the number of horizontal week lines in a month.
export function getLinesInMonth (year, month, weekStart) {
    const dayCount = getDaysInMonth(year, month);
    const firstWeekdayNormalized = getFirstWeekdayNormalized(year, month, weekStart);
    return Math.ceil((firstWeekdayNormalized + dayCount) / 7);
}

/// Compares Date objects with regard to their date only.
export function dateCmp (a, b) {
    if (a === null || b === null) return 0;
    a = a.getTime() - a.getTimezoneOffset() * 60000;
    b = b.getTime() - b.getTimezoneOffset() * 60000;
    a = Math.floor(a / 86400000) * 86400000;
    b = Math.floor(b / 86400000) * 86400000;
    return a - b;
}

/// Returns true if the given dates are the same date in the local time zone.
export function isSameDayLZ (a, b) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}
