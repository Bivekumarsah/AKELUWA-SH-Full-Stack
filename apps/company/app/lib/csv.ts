export function serializeCSV(rows: Array<Array<string | number>>): string {
  return rows.map((row) => row.map((value) => {
    const text = String(value);
    // Spreadsheet programs interpret quoted cells as formulas too.
    const safe = typeof value === "string" && (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
}
