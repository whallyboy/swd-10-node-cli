import { test, describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "../src/args.js";
import { addExpense, listExpenses, deleteExpense, editExpense, shortId } from "../src/expenses.js";
import { summarize, barChart, budgetStatus } from "../src/report.js";
import { toCsv, fromCsv, parseCsvLine } from "../src/csv.js";

describe("parseArgs", () => {
  it("parses add command with all options", () => {
    const result = parseArgs([
      "add",
      "--amount", "2500",
      "--category", "food",
      "--note", "lunch",
      "--date", "2026-11-03"
    ]);
    assert.equal(result.command, "add");
    assert.equal(result.options.amount, 2500);
    assert.equal(result.options.category, "food");
    assert.equal(result.options.note, "lunch");
    assert.equal(result.options.date, "2026-11-03");
  });

  it("parses list command with filters", () => {
    const result = parseArgs([
      "list",
      "--category", "food",
      "--month", "2026-11"
    ]);
    assert.equal(result.command, "list");
    assert.equal(result.options.category, "food");
    assert.equal(result.options.month, "2026-11");
  });

  it("parses global --no-color flag before command", () => {
    const result = parseArgs(["--no-color", "list"]);
    assert.equal(result.command, "list");
    assert.equal(result.options.noColor, true);
  });

  it("returns help for empty argv", () => {
    const result = parseArgs([]);
    assert.equal(result.command, "help");
  });
});

describe("addExpense", () => {
  const baseList = [];

  it("adds valid expense with generated UUID", () => {
    const result = addExpense(baseList, {
      amount: 2500,
      category: "food",
      note: "lunch",
      date: "2026-11-03"
    });
    assert.equal(result.length, 1);
    assert.ok(result[0].id.match(/^[0-9a-f-]{36}$/));
    assert.equal(result[0].amount, 2500);
    assert.equal(result[0].category, "food");
    assert.equal(result[0].note, "lunch");
    assert.equal(result[0].date, "2026-11-03");
  });

  it("uses today's date when date not provided", () => {
    const today = new Date().toISOString().split("T")[0];
    const result = addExpense(baseList, { amount: 1000, category: "test" });
    assert.equal(result[0].date, today);
  });

  it("throws on missing amount", () => {
    assert.throws(
      () => addExpense(baseList, { category: "food" }),
      /Amount must be a positive number/
    );
  });

  it("throws on zero or negative amount", () => {
    assert.throws(() => addExpense(baseList, { amount: 0, category: "food" }), /positive/);
    assert.throws(() => addExpense(baseList, { amount: -100, category: "food" }), /positive/);
  });

  it("throws on missing category", () => {
    assert.throws(
      () => addExpense(baseList, { amount: 1000 }),
      /Category is required/
    );
  });

  it("lowercases category", () => {
    const result = addExpense(baseList, { amount: 1000, category: "FOOD" });
    assert.equal(result[0].category, "food");
  });
});

describe("listExpenses", () => {
  const expenses = [
    { id: "1", amount: 1000, category: "food", date: "2026-11-01", note: "" },
    { id: "2", amount: 2000, category: "transport", date: "2026-11-02", note: "" },
    { id: "3", amount: 3000, category: "food", date: "2026-10-15", note: "" },
  ];

  it("returns all expenses when no filters", () => {
    const result = listExpenses(expenses, {});
    assert.equal(result.length, 3);
  });

  it("filters by category", () => {
    const result = listExpenses(expenses, { category: "food" });
    assert.equal(result.length, 2);
    assert.ok(result.every(e => e.category === "food"));
  });

  it("filters by month", () => {
    const result = listExpenses(expenses, { month: "2026-11" });
    assert.equal(result.length, 2);
    assert.ok(result.every(e => e.date.startsWith("2026-11")));
  });

  it("filters by both category and month", () => {
    const result = listExpenses(expenses, { category: "food", month: "2026-11" });
    assert.equal(result.length, 1);
    assert.equal(result[0].category, "food");
    assert.ok(result[0].date.startsWith("2026-11"));
  });
});

describe("deleteExpense", () => {
  const expenses = [
    { id: "abc12345-6789", amount: 1000, category: "food", date: "2026-11-01", note: "" },
    { id: "def67890-1234", amount: 2000, category: "transport", date: "2026-11-02", note: "" },
  ];

  it("deletes expense by short ID", () => {
    const { deleted, remaining } = deleteExpense(expenses, "abc12345");
    assert.equal(deleted.id, "abc12345-6789");
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, "def67890-1234");
  });

  it("throws on non-existent ID", () => {
    assert.throws(() => deleteExpense(expenses, "nonexist"), /not found/);
  });
});

describe("editExpense", () => {
  const expenses = [
    { id: "abc12345-6789", amount: 1000, category: "food", date: "2026-11-01", note: "old" },
  ];

  it("updates amount", () => {
    const { updated, expenses: newList } = editExpense(expenses, "abc12345", { amount: 5000 });
    assert.equal(updated.amount, 5000);
    assert.equal(newList[0].amount, 5000);
  });

  it("updates category", () => {
    const { updated } = editExpense(expenses, "abc12345", { category: "transport" });
    assert.equal(updated.category, "transport");
  });

  it("updates note", () => {
    const { updated } = editExpense(expenses, "abc12345", { note: "new note" });
    assert.equal(updated.note, "new note");
  });

  it("throws on invalid amount", () => {
    assert.throws(() => editExpense(expenses, "abc12345", { amount: -100 }), /positive/);
  });
});

describe("summarize", () => {
  const expenses = [
    { id: "1", amount: 1000, category: "food", date: "2026-11-01", note: "" },
    { id: "2", amount: 2000, category: "transport", date: "2026-11-02", note: "" },
    { id: "3", amount: 3000, category: "food", date: "2026-11-03", note: "" },
  ];

  it("calculates total", () => {
    const result = summarize(expenses);
    assert.equal(result.total, 6000);
  });

  it("groups by category", () => {
    const result = summarize(expenses);
    assert.equal(result.byCategory.length, 2);
    const food = result.byCategory.find(c => c.category === "food");
    const transport = result.byCategory.find(c => c.category === "transport");
    assert.equal(food.total, 4000);
    assert.equal(transport.total, 2000);
  });

  it("finds biggest expense", () => {
    const result = summarize(expenses);
    assert.equal(result.biggest.amount, 3000);
    assert.equal(result.biggest.category, "food");
  });

  it("handles empty list", () => {
    const result = summarize([]);
    assert.equal(result.total, 0);
    assert.equal(result.byCategory.length, 0);
    assert.equal(result.biggest, null);
  });

  it("includes budget", () => {
    const result = summarize(expenses, 10000);
    assert.equal(result.budget, 10000);
  });
});

describe("barChart", () => {
  it("scales bars to max value", () => {
    const byCategory = [
      { category: "food", total: 1000 },
      { category: "transport", total: 500 },
    ];
    const bars = barChart(byCategory, 10);
    assert.ok(bars[0].bar.length >= bars[1].bar.length);
    assert.equal(bars[0].bar.length, 10);
    assert.equal(bars[1].bar.length, 5);
  });

  it("ensures minimum bar length of 1", () => {
    const byCategory = [
      { category: "a", total: 1000 },
      { category: "b", total: 1 },
    ];
    const bars = barChart(byCategory, 20);
    assert.ok(bars[1].bar.length >= 1);
  });
});

describe("budgetStatus", () => {
  it("returns null when no budget", () => {
    assert.equal(budgetStatus(5000, null), null);
    assert.equal(budgetStatus(5000, 0), null);
  });

  it("calculates percentage", () => {
    const result = budgetStatus(5000, 10000);
    assert.equal(result.pct, 50);
    assert.equal(result.level, "ok");
  });

  it("warns at 80%", () => {
    const result = budgetStatus(8000, 10000);
    assert.equal(result.level, "warning");
  });

  it("alerts over 100%", () => {
    const result = budgetStatus(11000, 10000);
    assert.equal(result.level, "over");
  });
});

describe("toCsv escaping", () => {
  it("escapes commas", () => {
    const expenses = [{ id: "1", date: "2026-11-01", category: "food", amount: 1000, note: "lunch, dinner" }];
    const csv = toCsv(expenses);
    assert.ok(csv.includes('"lunch, dinner"'));
  });

  it("escapes quotes", () => {
    const expenses = [{ id: "1", date: "2026-11-01", category: "food", amount: 1000, note: 'say "hello"' }];
    const csv = toCsv(expenses);
    assert.ok(csv.includes('"say ""hello"""'));
  });

  it("escapes newlines", () => {
    const expenses = [{ id: "1", date: "2026-11-01", category: "food", amount: 1000, note: "line1\nline2" }];
    const csv = toCsv(expenses);
    assert.ok(csv.includes('"line1\nline2"'));
  });

  it("does not quote simple values", () => {
    const expenses = [{ id: "1", date: "2026-11-01", category: "food", amount: 1000, note: "simple" }];
    const csv = toCsv(expenses);
    assert.ok(csv.includes("simple"));
    assert.ok(!csv.includes('"simple"'));
  });

  it("produces correct header", () => {
    const expenses = [{ id: "1", date: "2026-11-01", category: "food", amount: 1000, note: "" }];
    const csv = toCsv(expenses);
    assert.ok(csv.startsWith("id,date,category,amount,note\n"));
  });

  it("handles empty list", () => {
    const csv = toCsv([]);
    assert.equal(csv, "id,date,category,amount,note\n");
  });
});

describe("fromCsv parsing", () => {
  it("parses valid CSV", () => {
    const csv = `id,date,category,amount,note
1,2026-11-01,food,1000,lunch`;
    const { expenses, errors } = fromCsv(csv);
    assert.equal(expenses.length, 1);
    assert.equal(errors.length, 0);
    assert.equal(expenses[0].amount, 1000);
  });

  it("handles quoted fields with commas", () => {
    const csv = `id,date,category,amount,note
1,2026-11-01,food,1000,"lunch, dinner"`;
    const { expenses } = fromCsv(csv);
    assert.equal(expenses[0].note, "lunch, dinner");
  });

  it("reports errors for invalid rows", () => {
    const csv = `id,date,category,amount,note
1,2026-11-01,food,1000,lunch
2,,food,1000,missing date`;
    const { expenses, errors } = fromCsv(csv);
    assert.equal(expenses.length, 1);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].line, 3);
  });

  it("handles BOM", () => {
    const csv = "\uFEFFid,date,category,amount,note\n1,2026-11-01,food,1000,lunch";
    const { expenses } = fromCsv(csv);
    assert.equal(expenses.length, 1);
  });
});

describe("shortId", () => {
  it("returns first 8 characters", () => {
    assert.equal(shortId("abc12345-6789"), "abc12345");
    assert.equal(shortId("1234567890abcdef"), "12345678");
  });
});

describe("parseCsvLine", () => {
  it("parses simple line", () => {
    const result = parseCsvLine("a,b,c");
    assert.deepEqual(result, ["a", "b", "c"]);
  });

  it("handles quoted fields", () => {
    const result = parseCsvLine('"a,b",c');
    assert.deepEqual(result, ["a,b", "c"]);
  });

  it("handles escaped quotes", () => {
    const result = parseCsvLine('"a""b",c');
    assert.deepEqual(result, ['a"b', "c"]);
  });
});