import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type ContactInput = Omit<Database["public"]["Tables"]["contacts"]["Insert"], "id" | "user_id" | "created_at" | "updated_at">;

export const DEFAULT_CATEGORIES = [
  "Agriculture", "AgriTech", "Food", "Investor", "Client", "Potential Client",
  "Supplier", "Government", "Startup", "Expo", "Networking", "Other",
];

export const CONTACT_FIELDS: { key: keyof ContactInput; label: string; type?: string; wide?: boolean }[] = [
  { key: "full_name", label: "Full name" },
  { key: "designation", label: "Designation" },
  { key: "company_name", label: "Company" },
  { key: "mobile", label: "Mobile", type: "tel" },
  { key: "alternate_mobile", label: "Alternate mobile", type: "tel" },
  { key: "whatsapp", label: "WhatsApp", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "website", label: "Website" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "address", label: "Address", wide: true },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "pincode", label: "PIN code" },
];

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function listContacts(): Promise<Contact[]> {
  return check(await supabase.from("contacts").select("*").order("created_at", { ascending: false }));
}

export async function getContact(id: string): Promise<Contact | null> {
  return check(await supabase.from("contacts").select("*").eq("id", id).maybeSingle());
}

export async function createContact(input: ContactInput): Promise<Contact> {
  const row = check(await supabase.from("contacts").insert(input).select().single());
  await upsertCompany(input.company_name, input);
  return row;
}

export async function updateContact(id: string, input: Partial<ContactInput>): Promise<Contact> {
  const row = check(await supabase.from("contacts").update(input).eq("id", id).select().single());
  if (input.company_name) await upsertCompany(input.company_name, input);
  return row;
}

export async function deleteContact(c: Contact) {
  check(await supabase.from("contacts").delete().eq("id", c.id));
  if (c.card_image_url) await supabase.storage.from("cards").remove([c.card_image_url]);
}

async function upsertCompany(name: string | null | undefined, c: Partial<ContactInput>) {
  if (!name?.trim()) return;
  await supabase.from("companies").upsert(
    { company_name: name.trim(), website: c.website ?? "", city: c.city ?? "", state: c.state ?? "", country: c.country ?? "" },
    { onConflict: "user_id,company_name", ignoreDuplicates: true },
  );
}

const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "").slice(-10);

export async function findDuplicates(input: ContactInput, excludeId?: string): Promise<Contact[]> {
  const all = await listContacts();
  const m = digits(input.mobile);
  const e = (input.email ?? "").trim().toLowerCase();
  const n = (input.full_name ?? "").trim().toLowerCase();
  const co = (input.company_name ?? "").trim().toLowerCase();
  return all.filter((c) => {
    if (c.id === excludeId) return false;
    if (m.length >= 7 && (digits(c.mobile) === m || digits(c.alternate_mobile) === m)) return true;
    if (e && (c.email ?? "").toLowerCase() === e) return true;
    if (n && co && c.full_name.toLowerCase() === n && (c.company_name ?? "").toLowerCase() === co) return true;
    return false;
  });
}

/** Fill empty fields of the existing contact with the new values; append notes. */
export function mergeInto(existing: Contact, incoming: ContactInput): Partial<ContactInput> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (v == null || v === "") continue;
    const cur = (existing as Record<string, unknown>)[k];
    if (k === "notes" && cur) out[k] = `${cur}\n${v}`;
    else if (cur == null || cur === "") out[k] = v;
  }
  return out as Partial<ContactInput>;
}

export async function uploadCardImage(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("You are signed out. Please sign in again.");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("cards").upload(path, file, { contentType: file.type });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return path;
}

export async function signedImageUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("cards").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function listCategories(): Promise<string[]> {
  const rows = check(await supabase.from("categories").select("name").order("name"));
  return [...DEFAULT_CATEGORIES, ...rows.map((r) => r.name).filter((n) => !DEFAULT_CATEGORIES.includes(n))];
}

export async function listCustomCategories() {
  return check(await supabase.from("categories").select("*").order("name"));
}
export async function addCategory(name: string) {
  check(await supabase.from("categories").insert({ name: name.trim() }));
}
export async function removeCategory(id: string) {
  check(await supabase.from("categories").delete().eq("id", id));
}

export async function dashboardStats() {
  const [cards, contacts, companies, review] = await Promise.all([
    supabase.from("scan_records").select("id", { count: "exact", head: true }),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("needs_review", true),
  ]);
  return { cards: cards.count ?? 0, contacts: contacts.count ?? 0, companies: companies.count ?? 0, review: review.count ?? 0 };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = () => rej(new Error("Could not read the image file."));
    r.readAsDataURL(file);
  });
}
