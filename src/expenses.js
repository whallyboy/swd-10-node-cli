import { randomUUID } from "node:crypto";

export function addExpense(list, input) {
  const { amount, category, note, date } = input;

  if (amount === undefined || isNaN(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number (in kobo)");
  }
  if (!category || typeof category !== "string") {
    throw new Error("Category is required");
  }

  const expense = {
    id: randomUUID(),
    amount,
    category: category.toLowerCase(),
    note: note || "",
    date: date || new Date().toISOString().split("T")[0],
  };

  return [...list, expense];
}

export function listExpenses(list, filters = {}) {
  const { category, month } = filters;

  return list.filter((expense) => {
    if (category && expense.category !== category.toLowerCase()) {
      return false;
    }
    if (month && !expense.date.startsWith(month)) {
      return false;
    }
    return true;
  });
}

export function deleteExpense(list, id) {
  const shortId = id.slice(0, 8);
  const index = list.findIndex((e) => e.id.startsWith(shortId));
  if (index === -1) {
    throw new Error(`Expense with id "${shortId}" not found`);
  }
  const deleted = list[index];
  return { deleted, remaining: list.filter((_, i) => i !== index) };
}

export function editExpense(list, id, updates) {
  const shortId = id.slice(0, 8);
  const index = list.findIndex((e) => e.id.startsWith(shortId));
  if (index === -1) {
    throw new Error(`Expense with id "${shortId}" not found`);
  }
  const expense = list[index];
  const updated = { ...expense };

  if (updates.amount !== undefined) {
    if (isNaN(updates.amount) || updates.amount <= 0) {
      throw new Error("Amount must be a positive number (in kobo)");
    }
    updated.amount = updates.amount;
  }
  if (updates.category !== undefined) {
    if (!updates.category || typeof updates.category !== "string") {
      throw new Error("Category is required");
    }
    updated.category = updates.category.toLowerCase();
  }
  if (updates.note !== undefined) {
    updated.note = updates.note;
  }
  if (updates.date !== undefined) {
    updated.date = updates.date;
  }

  const newList = [...list];
  newList[index] = updated;
  return { updated, expenses: newList };
}

export function shortId(id) {
  return id.slice(0, 8);
}