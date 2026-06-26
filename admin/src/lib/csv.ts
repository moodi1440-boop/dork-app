export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8,﻿" + encodeURIComponent(csv);
  a.download = filename;
  a.click();
}

export function exportCSVRaw(filename: string, rows: string[][]) {
  const escape = (v: string) => {
    const s = String(v ?? "");
    return /[";'\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = ["sep=;", ...rows.map((r) => r.map(escape).join(";"))].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8,﻿" + encodeURIComponent(csv);
  a.download = filename.endsWith(".csv") ? filename : filename + ".csv";
  a.click();
}
