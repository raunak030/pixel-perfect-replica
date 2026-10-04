import type { Contact } from "./contacts";

const CSV_COLS: (keyof Contact)[] = [
  "full_name",
  "designation",
  "company_name",
  "mobile",
  "alternate_mobile",
  "email",
  "whatsapp",
  "website",
  "linkedin",
  "address",
  "city",
  "state",
  "country",
  "pincode",
  "category",
  "event_source",
  "date_met",
  "notes",
  "created_at",
];

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function contactsToCsv(rows: Contact[]): string {
  const head = CSV_COLS.join(",");
  const body = rows.map((r) => CSV_COLS.map((k) => csvCell(r[k])).join(","));
  return ["\uFEFF" + head, ...body].join("\n");
}

/** Excel-compatible SpreadsheetML (.xls) — opens directly in Excel, no dependency. */
export function contactsToExcel(rows: Contact[]): string {
  const esc = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const cells = (r: Contact) =>
    CSV_COLS.map((k) => `<Cell><Data ss:Type="String">${esc(r[k])}</Data></Cell>`).join("");
  const header = CSV_COLS.map((k) => `<Cell><Data ss:Type="String">${esc(k)}</Data></Cell>`).join(
    "",
  );
  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Contacts"><Table>${`<Row>${header}</Row>`}${rows.map((r) => `<Row>${cells(r)}</Row>`).join("")}</Table></Worksheet></Workbook>`;
}

function vcardEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

export function contactsToVCard(rows: Contact[]): string {
  return rows
    .map((c) => {
      const addr = [c.address, c.city, c.state, c.pincode, c.country].filter(Boolean).join(", ");
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${vcardEscape(c.full_name || "Unnamed")}`,
        c.company_name ? `ORG:${vcardEscape(c.company_name)}` : "",
        c.designation ? `TITLE:${vcardEscape(c.designation)}` : "",
        c.mobile ? `TEL;TYPE=CELL,VOICE:${vcardEscape(c.mobile)}` : "",
        c.alternate_mobile ? `TEL;TYPE=HOME,VOICE:${vcardEscape(c.alternate_mobile)}` : "",
        c.whatsapp ? `X-WHATSAPP:${vcardEscape(c.whatsapp)}` : "",
        c.email ? `EMAIL;TYPE=INTERNET:${vcardEscape(c.email)}` : "",
        c.website ? `URL:${vcardEscape(c.website)}` : "",
        addr ? `ADR;TYPE=WORK:;;${vcardEscape(addr)}` : "",
        c.notes ? `NOTE:${vcardEscape(c.notes)}` : "",
        "END:VCARD",
      ].filter(Boolean);
      return lines.join("\r\n");
    })
    .join("\r\n");
}

export function downloadFile(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
