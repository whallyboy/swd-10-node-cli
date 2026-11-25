#!/usr/bin/env node

import { parseArgs } from "../src/args.js";
import { loadExpenses, saveExpenses, loadSettings, saveSettings } from "../src/store.js";
import { addExpense, listExpenses, deleteExpense, editExpense, shortId } from "../src/expenses.js";
import { summarize, barChart, budgetStatus } from "../src/report.js";
import { toCsv, fromCsv } from "../src/csv.js";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { writeFile } from "node:fs/promises";
import { style, c } from "../src/color.js";

const { command, options } = parseArgs(process.argv.slice(2));
const DEBUG = process.env.DEBUG === "1";

function logError(err) {
  if (DEBUG) {
    console.error(err.stack);
  } else {
    console.error(style.error("Error:"), err.message);
  }
}

async function main() {
  let exitCode = 0;
  try {
    switch (command) {
      case "add": {
        const expenses = await loadExpenses();
        const newExpenses = addExpense(expenses, options);
        await saveExpenses(newExpenses);
        const expense = newExpenses[newExpenses.length - 1];
        console.log(style.success("Added expense:"), formatExpense(expense));
        break;
      }
      case "list": {
        const expenses = await loadExpenses();
        const filtered = listExpenses(expenses, options);
        printTable(filtered);
        break;
      }
      case "delete": {
        const expenses = await loadExpenses();
        const { deleted, remaining } = deleteExpense(expenses, options.id);
        await saveExpenses(remaining);
        console.log(style.success("Deleted:"), formatExpense(deleted));
        break;
      }
      case "edit": {
        const expenses = await loadExpenses();
        const { updated, expenses: newExpenses } = editExpense(expenses, options.id, options);
        await saveExpenses(newExpenses);
        console.log(style.success("Updated:"), formatExpense(updated));
        break;
      }
      case "summary": {
        const expenses = await loadExpenses();
        const settings = await loadSettings();
        const filtered = listExpenses(expenses, options);
        const summary = summarize(filtered, settings.budget);
        printSummary(summary);
        break;
      }
      case "budget": {
        const settings = await loadSettings();
        if (options.set !== undefined) {
          const amount = parseInt(options.set, 10);
          if (isNaN(amount) || amount < 0) {
            throw new Error("Budget must be a non-negative number (in kobo)");
          }
          settings.budget = amount;
          await saveSettings(settings);
          const fmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
          console.log(style.success(`Budget set to ${fmt.format(amount / 100)}`));
        } else {
          const fmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
          console.log(`Current budget: ${settings.budget ? fmt.format(settings.budget / 100) : style.muted("not set")}`);
        }
        break;
      }
      case "export": {
        const expenses = await loadExpenses();
        const filtered = listExpenses(expenses, options);
        const format = options.format || "csv";
        if (format !== "csv") {
          throw new Error(`Unsupported format: ${format}. Only 'csv' is supported.`);
        }
        const csv = toCsv(filtered);
        const out = options.out || "expenses.csv";
        await writeFile(out, csv, "utf8");
        console.log(style.success(`Exported ${filtered.length} expenses to ${out}`));
        break;
      }
      case "import": {
        if (!options.file) {
          throw new Error("--file is required for import");
        }
        const { expenses, errors } = await importCsv(options.file);
        if (expenses.length > 0) {
          const existing = await loadExpenses();
          const merged = mergeExpenses(existing, expenses);
          await saveExpenses(merged);
          console.log(style.success(`Imported ${expenses.length} expenses`));
        } else {
          console.log(style.warning("No valid expenses to import"));
        }
        if (errors.length > 0) {
          console.log(style.warning(`Skipped ${errors.length} invalid line(s):`));
          for (const { line, content, error } of errors) {
            console.log(style.muted(`  Line ${line}: ${error}`));
            if (DEBUG) console.log(style.muted(`    Content: ${content}`));
          }
        }
        break;
      }
      case "help":
      default:
        printHelp();
    }
  } catch (err) {
    logError(err);
    exitCode = 1;
  }
  process.exitCode = exitCode;
}

function formatExpense(e) {
  const fmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
  return `${style.id(shortId(e.id))} | ${style.date(e.date)} | ${style.category(e.category.padEnd(12))} | ${style.amount(fmt.format(e.amount / 100).padStart(12))} | ${e.note || ""}`;
}

function printTable(expenses) {
  if (expenses.length === 0) {
    console.log(style.muted("No expenses found."));
    return;
  }
  const fmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
  console.log(`${style.header("ID")}        | ${style.header("DATE")}       | ${style.header("CATEGORY")}     | ${style.header("AMOUNT")}       | ${style.header("NOTE")}`);
  console.log(style.muted("----------|------------|--------------|--------------|-----"));
  for (const e of expenses) {
    console.log(`${style.id(shortId(e.id))} | ${style.date(e.date)} | ${style.category(e.category.padEnd(12))} | ${style.amount(fmt.format(e.amount / 100).padStart(12))} | ${e.note || ""}`);
  }
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  console.log(style.muted("----------|------------|--------------|--------------|-----"));
  console.log(`${style.header("TOTAL".padEnd(9))} | ${"".padEnd(10)} | ${"".padEnd(12)} | ${style.amount(fmt.format(total / 100).padStart(12))} |`);
}

function printSummary(summary) {
  const fmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
  const { total, byCategory, biggest, budget } = summary;

  console.log(`\n${style.header("=== EXPENSE SUMMARY === ")}`);
  console.log(`${style.header("Total:")} ${style.amount(fmt.format(total / 100))}`);

  if (byCategory.length > 0) {
    console.log(`\n${style.header("By category:")}`);
    const bars = barChart(byCategory);
    for (const { category, bar, total: catTotal } of bars) {
      console.log(`  ${style.category(category.padEnd(12))} ${bar} ${style.amount(fmt.format(catTotal / 100))}`);
    }
  }

  if (biggest) {
    console.log(`\n${style.header("Biggest expense:")} ${formatExpense(biggest)}`);
  }

  const status = budgetStatus(total, budget);
  if (status) {
    const { pct, level } = status;
    const bar = "█".repeat(Math.min(20, Math.round(pct / 5)));
    let label, labelStyle;
    if (level === "over") {
      label = "⚠ OVER BUDGET";
      labelStyle = style.error;
    } else if (level === "warning") {
      label = "⚠ 80% reached";
      labelStyle = style.warning;
    } else {
      label = "OK";
      labelStyle = style.success;
    }
    console.log(`\n${style.header("Budget:")} ${fmt.format(status.budget / 100)} | ${style.header("Spent:")} ${pct}% ${bar} ${labelStyle(label)}`);
  }
  console.log();
}

async function importCsv(filePath) {
  const fileStream = createReadStream(filePath, { encoding: "utf8" });
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  let csv = "";
  for await (const line of rl) {
    csv += line + "\n";
  }

  return fromCsv(csv);
}

function mergeExpenses(existing, imported) {
  const byId = new Map(existing.map((e) => [e.id, e]));
  for (const e of imported) {
    byId.set(e.id, e);
  }
  return Array.from(byId.values());
}

function printHelp() {
  console.log(`
${style.header("Usage: expense <command> [options]")}

${style.header("Commands:")}
  ${style.info("add")}       Add a new expense
  ${style.info("list")}      List expenses
  ${style.info("delete")}    Delete an expense by ID
  ${style.info("edit")}      Edit an expense by ID
  ${style.info("summary")}   Show spending summary
  ${style.info("budget")}    Set or view budget
  ${style.info("export")}    Export expenses to CSV
  ${style.info("import")}    Import expenses from CSV
  ${style.info("help")}      Show this help

${style.header("Add options:")}
  ${style.info("--amount")}     <number>     Amount in kobo (e.g., 2500 for ₦25.00)
  ${style.info("--category")}   <string>     Category (e.g., food, transport)
  ${style.info("--note")}       <string>     Optional note
  ${style.info("--date")}       <YYYY-MM-DD> Optional date (default: today)

${style.header("List options:")}
  ${style.info("--category")}   <string>     Filter by category
  ${style.info("--month")}      <YYYY-MM>    Filter by month

${style.header("Delete options:")}
  ${style.info("--id")}         <string>     Expense ID (first 8 chars)

${style.header("Edit options:")}
  ${style.info("--id")}         <string>     Expense ID (first 8 chars)
  ${style.info("--amount")}     <number>     New amount in kobo
  ${style.info("--category")}   <string>     New category
  ${style.info("--note")}       <string>     New note
  ${style.info("--date")}       <YYYY-MM-DD> New date

${style.header("Summary options:")}
  ${style.info("--month")}      <YYYY-MM>    Filter by month

${style.header("Budget options:")}
  ${style.info("--set")}        <number>     Set budget in kobo (e.g., 50000 for ₦500.00)

${style.header("Export options:")}
  ${style.info("--format")}      <csv>        Output format (only csv supported)
  ${style.info("--out")}         <file>       Output file (default: expenses.csv)

${style.header("Import options:")}
  ${style.info("--file")}        <file>       CSV file to import

${style.header("Global options:")}
  ${style.info("--no-color")}              Disable colored output
  ${style.info("DEBUG=1")}                 Show full stack traces on error

${style.header("Examples:")}
  expense add --amount 2500 --category food --note "lunch"
  expense add --amount 15000 --category transport --date 2026-11-03
  expense list
  expense list --category food
  expense list --month 2026-11
  expense delete --id a1b2c3d4
  expense edit --id a1b2c3d4 --amount 3000 --note "big lunch"
  expense summary
  expense summary --month 2026-11
  expense budget --set 50000
  expense budget
  expense export --out expenses.csv
  expense import --file bank.csv
  expense --no-color list
  DEBUG=1 expense add --amount 2500
`);
}

main();