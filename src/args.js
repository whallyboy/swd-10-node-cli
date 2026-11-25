import { parseArgs as utilParseArgs } from "node:util";

export function parseArgs(argv) {
  if (argv.length === 0) {
    return { command: "help", options: {} };
  }

  const globalFlags = { noColor: false };
  let i = 0;
  while (i < argv.length && argv[i].startsWith("--")) {
    if (argv[i] === "--no-color") {
      globalFlags.noColor = true;
    } else if (argv[i] === "--help" || argv[i] === "-h") {
      globalFlags.help = true;
    }
    i++;
  }

  const remaining = argv.slice(i);
  if (remaining.length === 0) {
    return { command: "help", options: globalFlags };
  }

  const command = remaining[0];
  const rest = remaining.slice(1);

  const { values, positionals } = utilParseArgs({
    args: rest,
    options: {
      amount: { type: "string" },
      category: { type: "string" },
      note: { type: "string" },
      date: { type: "string" },
      month: { type: "string" },
      id: { type: "string" },
      set: { type: "string" },
      format: { type: "string" },
      out: { type: "string" },
      file: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  return {
    command,
    options: {
      amount: values.amount ? parseInt(values.amount, 10) : undefined,
      category: values.category,
      note: values.note,
      date: values.date,
      month: values.month,
      id: values.id,
      set: values.set,
      format: values.format,
      out: values.out,
      file: values.file,
      noColor: globalFlags.noColor,
      help: values.help || globalFlags.help,
    },
  };
}