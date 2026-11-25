# expense — CLI Expense Tracker

A pure Node.js CLI expense tracker with no npm dependencies.

## Install

```bash
npm install
npm link   # makes `expense` available globally
```

Or run directly:
```bash
node bin/expense.js <command> [options]
```

## Commands

### Add an expense
```bash
expense add --amount 2500 --category food --note "lunch"
expense add --amount 15000 --category transport --date 2026-11-03
```
- `--amount` — amount in **kobo** (2500 = ₦25.00)
- `--category` — category name (e.g., food, transport)
- `--note` — optional description
- `--date` — optional date (YYYY-MM-DD, default: today)

### List expenses
```bash
expense list
expense list --category food
expense list --month 2026-11
```
- `--category` — filter by category
- `--month` — filter by month (YYYY-MM)

### Delete an expense
```bash
expense delete --id a1b2c3d4
```
- `--id` — first 8 characters of the expense UUID

### Edit an expense
```bash
expense edit --id a1b2c3d4 --amount 3000 --note "big lunch"
```
- `--id` — first 8 characters of the expense UUID
- `--amount` — new amount in kobo
- `--category` — new category
- `--note` — new note
- `--date` — new date (YYYY-MM-DD)

### Summary
```bash
expense summary
expense summary --month 2026-11
```
Shows:
- Total spent
- Per-category breakdown with text bar chart
- Biggest single expense
- Budget status (if set) with 80%/100% warnings

### Budget
```bash
expense budget --set 50000   # ₦500.00
expense budget               # view current budget
```
- `--set` — budget in kobo

### Export to CSV
```bash
expense export --out expenses.csv
expense export --format csv --out my-expenses.csv
```
- `--format` — only `csv` supported
- `--out` — output file (default: expenses.csv)

### Import from CSV
```bash
expense import --file bank.csv
```
- `--file` — CSV file to import (required)
- Uses streaming (readline + fs.createReadStream) for memory efficiency
- Reports skipped lines with line numbers
- Merges by UUID (updates existing, adds new)

### Help
```bash
expense help
# or
expense --help
```

### Global options
```bash
expense --no-color list     # disable ANSI colors
DEBUG=1 expense add ...     # show full stack traces on error
```

## CSV Format

The CSV has columns: `id,date,category,amount,note`

- `amount` is in **kobo** (integer)
- Fields with commas, quotes, or newlines are quoted and escaped
- UTF-8 encoding, handles BOM

Example:
```csv
id,date,category,amount,note
abc12345-6789...,2026-11-01,food,2500,"lunch, dinner"
```

## Data Storage

- `data/expenses.json` — expense records
- `data/settings.json` — budget setting

## Testing

```bash
npm test
```

Runs 45 tests using `node:test` and `node:assert/strict`.

## How it works

- **ES modules** (`"type": "module"` in package.json)
- **No dependencies** — only Node.js built-ins
- **Pure functions** in `src/` for testability (no I/O)
- **Shebang** (`#!/usr/bin/env node`) + `bin` field in package.json enables `npm link`
- **Streams** for CSV import — constant memory for large files

## Requirements

Node.js 20+