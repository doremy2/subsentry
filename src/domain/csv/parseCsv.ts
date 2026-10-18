/** Minimal RFC 4180 CSV reader. Pure and local: operates on a string already in memory. */

export interface ParsedCsv {
  delimiter: string;
  /** Non-empty rows; cells are untrimmed strings. */
  rows: string[][];
}

const DELIMITERS = [",", ";", "\t", "|"] as const;

/** Pick the delimiter that appears most in the first non-empty line (European banks use ";"). */
export function detectDelimiter(text: string): string {
  const firstLine = text.replace(/^﻿/, "").split(/\r\n|\n|\r/).find((line) => line.trim().length > 0) ?? "";
  let best: string = ",";
  let bestCount = 0;
  for (const d of DELIMITERS) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) [best, bestCount] = [d, count];
  }
  return best;
}

export function parseCsv(text: string, delimiter: string = detectDelimiter(text)): ParsedCsv {
  const source = text.replace(/^﻿/, ""); // strip BOM (Excel exports)
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c.trim().length > 0)) rows.push(row); // drop blank lines
    row = [];
  };

  for (let i = 0; i < source.length; i += 1) {
    const ch = source.charAt(i);
    if (inQuotes) {
      if (ch === '"') {
        if (source.charAt(i + 1) === '"') {
          cell += '"';
          i += 1;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) endCell();
    else if (ch === "\n") endRow();
    else if (ch === "\r") {
      if (source.charAt(i + 1) === "\n") i += 1;
      endRow();
    } else cell += ch;
  }
  if (cell.length > 0 || row.length > 0) endRow();
  return { delimiter, rows };
}
