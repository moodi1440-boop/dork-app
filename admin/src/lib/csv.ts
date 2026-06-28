// PDF: headers + صفوف منظمة → نافذة طباعة
export function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const thead = headers.map(h => `<th>${h}</th>`).join("");
  const tbody = rows.map(r =>
    `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`
  ).join("");
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>${title}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;padding:24px;color:#111;font-size:12px}
h2{font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:16px;border-bottom:2px solid #d4af37;padding-bottom:8px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th{background:#1a1a2e;color:#d4af37;padding:8px 10px;text-align:right;font-weight:700}
td{padding:7px 10px;border-bottom:1px solid #e5e5e5;text-align:right}
tr:nth-child(even) td{background:#f8f8f8}
@media print{@page{margin:15mm}}</style></head>
<body><h2>${title}</h2><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}

// PDF: صفوف مدمجة (صالونات، عملاء) — يفصل تلقائياً بين معلومات وجدول
export function exportPDFRaw(title: string, rows: string[][]) {
  const infoRows: string[][] = [];
  const tableRows: string[][] = [];
  let tableHeaders: string[] = [];
  let inTable = false;
  for (const row of rows) {
    if (row.length === 0) continue;
    if (!inTable && row.length > 2) { inTable = true; tableHeaders = row; continue; }
    if (inTable) tableRows.push(row);
    else infoRows.push(row);
  }
  const infoHtml = infoRows.map(r =>
    `<tr><td style="font-weight:700;color:#555;width:45%;padding:6px 10px;border-bottom:1px solid #eee">${r[0] ?? ""}</td>` +
    `<td style="padding:6px 10px;border-bottom:1px solid #eee">${r[1] ?? ""}</td></tr>`
  ).join("");
  const tableHtml = tableHeaders.length ? `
<h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;color:#1a1a2e">الحجوزات (${tableRows.length})</h3>
<table style="font-size:11px"><thead><tr>${tableHeaders.map(h =>
    `<th style="background:#1a1a2e;color:#d4af37;padding:6px 8px;text-align:right">${h}</th>`
  ).join("")}</tr></thead><tbody>${tableRows.map(r =>
    `<tr>${r.map(c => `<td style="padding:5px 8px;border-bottom:1px solid #eee">${c ?? ""}</td>`).join("")}</tr>`
  ).join("")}</tbody></table>` : "";
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>${title}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;padding:24px;color:#111;font-size:12px}
h2{font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:16px;border-bottom:2px solid #d4af37;padding-bottom:8px}
table{width:100%;border-collapse:collapse}
@media print{@page{margin:15mm}}</style></head>
<body><h2>${title}</h2><table>${infoHtml}</table>${tableHtml}</body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
}
