function monthKey(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
}

export function calculateMonthlyPnlChanges(points, pnlKey, monthCount = 6) {
  const count = Math.max(1, Math.trunc(Number(monthCount) || 1));
  const ordered = [...points]
    .filter((point) => monthKey(point.snapshot_date))
    .sort((a, b) => String(a.snapshot_date).localeCompare(String(b.snapshot_date)));
  const monthlyChanges = new Map();

  ordered.forEach((point, index) => {
    const key = monthKey(point.snapshot_date);
    const previous = ordered[index - 1];
    const change = previous
      ? Number(point[pnlKey] ?? 0) - Number(previous[pnlKey] ?? 0)
      : 0;
    monthlyChanges.set(key, Number(monthlyChanges.get(key) ?? 0) + change);
  });

  return [...monthlyChanges.entries()]
    .map(([month, value]) => ({ month, value }))
    .slice(-count);
}
