const isTTY = process.stdout.isTTY;
const noColor = process.argv.includes("--no-color") || process.env.NO_COLOR;
const enabled = isTTY && !noColor;

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

export function c(text, color) {
  if (!enabled || !colors[color]) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

export function stripColor(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

export const style = {
  header: (t) => c(t, "bold"),
  success: (t) => c(t, "green"),
  error: (t) => c(t, "red"),
  warning: (t) => c(t, "yellow"),
  info: (t) => c(t, "blue"),
  muted: (t) => c(t, "gray"),
  amount: (t) => c(t, "cyan"),
  category: (t) => c(t, "magenta"),
  id: (t) => c(t, "dim"),
  date: (t) => c(t, "blue"),
};