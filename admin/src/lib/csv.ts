export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const tableHeader = headers.map(h => `<th>${h}</th>`).join('');
  const tableRows = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');

  const excelContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"/></head><body><table border="1"><tr>${tableHeader}</tr>${tableRows}</table></body></html>`;

  const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.(csv|xls|xlsx)$/i, "") + ".xls";
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSVRaw(filename: string, rows: string[][]) {
  const escape = (v: string) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\r\n");
  const BOM = "﻿";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
