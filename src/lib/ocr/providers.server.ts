import type { OcrProvider, OcrResult } from "./types";

const SAMPLES = [
  { full_name: "Ananya Rao", designation: "Head of Partnerships", company_name: "GreenLeaf AgriTech Pvt Ltd", mobile: "+91 98450 12345", email: "ananya@greenleaf.in", website: "greenleaf.in", linkedin: "linkedin.com/in/ananyarao", address: "42, 3rd Cross, Indiranagar", city: "Bengaluru", state: "Karnataka", country: "India", pincode: "560038" },
  { full_name: "Rahul Mehta", designation: "Founder & CEO", company_name: "FarmFresh Foods", mobile: "+91 99200 55511", email: "rahul@farmfresh.co", website: "farmfresh.co", linkedin: "", address: "Plot 17, MIDC Andheri East", city: "Mumbai", state: "Maharashtra", country: "India", pincode: "400093" },
  { full_name: "Priya Sharma", designation: "Investment Manager", company_name: "Seedline Capital", mobile: "+91 98100 77788", email: "priya.sharma@seedline.vc", website: "seedline.vc", linkedin: "linkedin.com/in/priyasharma", address: "DLF Cyber City, Tower B", city: "Gurugram", state: "Haryana", country: "India", pincode: "122002" },
];

/** Development-only provider. Returns sample data; never reads the image. */
export const mockProvider: OcrProvider = {
  name: "mock",
  async extract(): Promise<OcrResult> {
    await new Promise((r) => setTimeout(r, 900));
    const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]!;
    const data = { alternate_mobile: "", whatsapp: s.mobile, notes: "", ...s };
    return {
      provider: "mock",
      mock: true,
      confidence: 0,
      raw_text: Object.values(s).filter(Boolean).join("\n"),
      data,
    };
  },
};

/**
 * Pick the active provider. To connect a real OCR/vision API, implement
 * OcrProvider and return it here when OCR_PROVIDER is set.
 */
export function getOcrProvider(): OcrProvider {
  const name = process.env["OCR_PROVIDER"];
  switch (name) {
    // case "google-vision": return googleVisionProvider;
    default:
      return mockProvider;
  }
}
