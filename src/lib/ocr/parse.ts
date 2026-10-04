import { EMPTY_OCR, type OcrContact } from "./types";

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const PHONE_RE = /\+?\d[\d\s\-().]{6,}\d/g;
const LINKEDIN_RE = /linkedin\.com\/\S+/i;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[\w-]+(?:\.[\w-]+)*(?:\.(?:com|in|co|io|net|org|vc|ai|dev|app|us|uk|ae|sg))\b[\w./-]*/i;
const PIN_RE = /\b\d{6}\b/;
const DESIGNATION_RE =
  /\b(CEO|CTO|CFO|COO|CMO|Founder|Co-?Founder|Director|Managing Director|Manager|Head|VP|Vice President|President|Executive|Engineer|Developer|Designer|Consultant|Partner|Owner|Proprietor|Officer|Lead|Architect|Analyst|Advisor|Secretary|Chairman)\b/i;
const COMPANY_RE =
  /\b(Pvt|Private|Ltd|Limited|LLP|Inc|LLC|GmbH|Pty|Corp|Technologies|Technology|Solutions|Systems|Enterprises|Enterprise|Group|Capital|Foods|Agro|Agri|Labs|Studio|Works|Ventures|Partners)\b/i;
const ADDRESS_HINT_RE =
  /\b(road|rd\.?|street|st\.?|plot|sector|avenue|floor|tower|cross|nagar|colony|park|estate|phase|block|lane|marg|enclave|hub|campus|building|complex)\b/i;

// Compact gazetteer (heuristic v1 — extend as needed).
const CITIES = [
  "Bengaluru",
  "Bangalore",
  "Mumbai",
  "Delhi",
  "New Delhi",
  "Gurugram",
  "Gurgaon",
  "Noida",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Surat",
  "Lucknow",
  "Kanpur",
  "Indore",
  "Bhopal",
  "Patna",
  "Nagpur",
  "Kochi",
  "Coimbatore",
  "Mysuru",
  "Mysore",
  "Dubai",
  "Singapore",
  "London",
  "New York",
  "San Francisco",
];
const STATES = [
  "Karnataka",
  "Maharashtra",
  "Tamil Nadu",
  "Telangana",
  "West Bengal",
  "Gujarat",
  "Rajasthan",
  "Uttar Pradesh",
  "Madhya Pradesh",
  "Bihar",
  "Kerala",
  "Punjab",
  "Haryana",
  "Delhi",
  "Odisha",
];
const COUNTRIES: [RegExp, string][] = [
  [/\bindia\b/i, "India"],
  [/\b(usa|united states|u\.s\.a?)\b/i, "USA"],
  [/\b(uk|united kingdom)\b/i, "UK"],
  [/\b(uae|united arab emirates|dubai)\b/i, "UAE"],
  [/\bsingapore\b/i, "Singapore"],
];

const inList = (lists: string[], line: string) =>
  lists.find((c) => new RegExp(`\\b${c}\\b`, "i").test(line));

/**
 * Heuristic v1 card-text parser. Regexes handle email/phone/URL/pin reliably;
 * name/company/designation/city come from line patterns and may need user
 * correction in the review form (which is mandatory before saving).
 * Unmatched lines are preserved in `notes` so nothing is silently dropped.
 */
export function parseCardText(rawText: string): OcrContact {
  const data: OcrContact = { ...EMPTY_OCR };
  const lines = rawText
    .split("\n")
    .map((l) => l.trim().replace(/\s{2,}/g, " "))
    .filter(Boolean);
  if (lines.length === 0) return data;

  const used = new Set<number>();
  const claim = (i: number) => used.add(i);

  // Email / LinkedIn / website / phones / pincode first (most reliable).
  lines.forEach((line, i) => {
    if (!data.email) {
      const m = line.match(EMAIL_RE);
      if (m) {
        data.email = m[0];
        if (line.replace(m[0], "").trim().length < 3) claim(i);
      }
    }
    if (!data.linkedin) {
      const m = line.match(LINKEDIN_RE);
      if (m) {
        data.linkedin = m[0].replace(/[,.;:]+$/, "");
        if (line.replace(m[0], "").trim().length < 3) claim(i);
      }
    }
    if (!data.website) {
      const m = line.replace(EMAIL_RE, "").match(URL_RE);
      if (m && !m[0].includes("@")) {
        data.website = m[0].replace(/[,.;:]+$/, "");
        if (line.replace(m[0], "").trim().length < 3) claim(i);
      }
    }
  });

  const phones: string[] = [];
  lines.forEach((line, i) => {
    for (const m of line.matchAll(PHONE_RE)) {
      const digits = m[0].replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 13 && !phones.includes(m[0].trim())) {
        phones.push(m[0].trim());
        if (line.replace(m[0], "").trim().length < 3) claim(i);
      }
    }
  });
  // A bare 6-digit pin is not a phone number.
  const pinOnly = (p: string) => /^\d{6}$/.test(p.replace(/\D/g, ""));
  const mobiles = phones.filter((p) => !pinOnly(p));
  if (mobiles[0]) data.mobile = mobiles[0]!;
  if (mobiles[1]) data.alternate_mobile = mobiles[1]!;

  lines.forEach((line, i) => {
    if (used.has(i)) return;
    const pin = line.match(PIN_RE);
    if (pin) {
      data.pincode = pin[0];
      const city = inList(CITIES, line);
      if (city && !data.city) data.city = city;
      const state = inList(STATES, line);
      if (state && !data.state) data.state = state;
      for (const [re, name] of COUNTRIES) {
        if (!data.country && re.test(line)) data.country = name;
      }
    }
    if (ADDRESS_HINT_RE.test(line)) {
      data.address = data.address ? `${data.address}, ${line}` : line;
      claim(i);
      const city = inList(CITIES, line);
      if (city && !data.city) data.city = city;
      const state = inList(STATES, line);
      if (state && !data.state) data.state = state;
      for (const [re, name] of COUNTRIES) {
        if (!data.country && re.test(line)) data.country = name;
      }
    }
  });

  // Designation, company, name from remaining prominent lines.
  lines.forEach((line, i) => {
    if (used.has(i)) return;
    if (!data.designation && DESIGNATION_RE.test(line) && line.length < 60) {
      data.designation = line;
      claim(i);
    }
  });
  lines.forEach((line, i) => {
    if (used.has(i)) return;
    if (!data.company_name && COMPANY_RE.test(line)) {
      data.company_name = line;
      claim(i);
    }
  });
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const line = lines[i]!;
    if (used.has(i)) continue;
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){1,3}$/.test(line)) {
      data.full_name = line;
      claim(i);
      break;
    }
  }
  if (!data.full_name) {
    const fallback = lines.find(
      (line, i) =>
        !used.has(i) &&
        !EMAIL_RE.test(line) &&
        !URL_RE.test(line.replace(EMAIL_RE, "")) &&
        !line.match(PHONE_RE) &&
        line.length < 40,
    );
    if (fallback) {
      data.full_name = fallback;
      claim(lines.indexOf(fallback));
    }
  }

  const rest = lines.filter((_, i) => !used.has(i));
  if (rest.length > 0) data.notes = rest.join("\n");
  return data;
}
