function monthKey(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
}

export function latestCalendarMonths(rows, monthCount = 6) {
  const count = Math.max(1, Math.trunc(Number(monthCount) || 1));
  const ordered = [...rows]
    .filter((row) => monthKey(row.snapshot_date))
    .sort((a, b) => String(a.snapshot_date).localeCompare(String(b.snapshot_date)));

  if (!ordered.length) return [];

  const latestMonth = monthKey(ordered.at(-1).snapshot_date);
  const [year, month] = latestMonth.split("-").map(Number);
  const firstVisibleMonth = new Date(Date.UTC(year, month - count, 1)).toISOString().slice(0, 7);

  return ordered.filter((row) => {
    const key = monthKey(row.snapshot_date);
    return key >= firstVisibleMonth && key <= latestMonth;
  });
}
