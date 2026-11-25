export function summarize(expenses, budget = null) {
  if (expenses.length === 0) {
    return { total: 0, byCategory: [], biggest: null, budget };
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryMap = new Map();
  for (const e of expenses) {
    const current = categoryMap.get(e.category) || 0;
    categoryMap.set(e.category, current + e.amount);
  }

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const biggest = expenses.reduce((max, e) => (e.amount > max.amount ? e : max), expenses[0]);

  return { total, byCategory, biggest, budget };
}

export function barChart(byCategory, width = 20) {
  if (byCategory.length === 0) return [];
  const max = byCategory[0].total;
  return byCategory.map(({ category, total }) => {
    const filled = Math.max(1, Math.round((total / max) * width));
    const bar = "█".repeat(filled);
    return { category, bar, total };
  });
}

export function budgetStatus(total, budget) {
  if (!budget || budget <= 0) return null;
  const pct = (total / budget) * 100;
  let level = "ok";
  if (pct >= 100) level = "over";
  else if (pct >= 80) level = "warning";
  return { total, budget, pct: Math.round(pct), level };
}