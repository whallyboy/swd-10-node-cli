export function toCsv(expenses) {
  if (expenses.length === 0) return "id,date,category,amount,note\n";

  const header = ["id", "date", "category", "amount", "note"];
  const rows = expenses.map((e) => [
    e.id,
    e.date,
    e.category,
    String(e.amount),
    e.note || "",
  ]);

  const escape = (val) => {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n") + "\n";
}

export function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function fromCsv(csv) {
  const cleanCsv = csv.replace(/^\uFEFF/, "");
  const lines = cleanCsv.trim().split("\n");
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]);
  const expected = ["id", "date", "category", "amount", "note"];

  if (JSON.stringify(header) !== JSON.stringify(expected)) {
    throw new Error(`Invalid CSV header. Expected: ${expected.join(",")}, got: ${header.join(",")}`);
  }

  const expenses = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const fields = parseCsvLine(line);
      if (fields.length !== 5) {
        throw new Error(`Expected 5 fields, got ${fields.length}`);
      }

      const [id, date, category, amount, note] = fields;
      const amountNum = parseInt(amount, 10);

      if (!id || !date || !category || isNaN(amountNum) || amountNum <= 0) {
        throw new Error("Invalid field values");
      }

      expenses.push({
        id,
        date,
        category: category.toLowerCase(),
        amount: amountNum,
        note: note || "",
      });
    } catch (err) {
      errors.push({ line: i + 1, content: line, error: err.message });
    }
  }

  return { expenses, errors };
}