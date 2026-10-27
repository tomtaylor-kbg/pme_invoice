export function shiftReportPeriod(value, period, amount) {
  const date = period === "month"
    ? new Date(`${value}-01T00:00:00.000Z`)
    : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  if (period === "month") {
    date.setUTCMonth(date.getUTCMonth() + amount);
    return date.toISOString().slice(0, 7);
  }
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
