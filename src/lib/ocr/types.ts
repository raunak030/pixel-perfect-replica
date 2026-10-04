export interface OcrContact {
  full_name: string;
  designation: string;
  company_name: string;
  mobile: string;
  alternate_mobile: string;
  email: string;
  whatsapp: string;
  website: string;
  linkedin: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  notes: string;
}

export interface OcrResult {
  provider: string;
  mock: boolean;
  raw_text: string;
  confidence: number;
  data: OcrContact;
}

export interface OcrInput {
  imageBase64: string;
  mimeType: string;
}

/** Any OCR / vision backend must implement this. */
export interface OcrProvider {
  name: string;
  extract(input: OcrInput): Promise<OcrResult>;
}

export const EMPTY_OCR: OcrContact = {
  full_name: "", designation: "", company_name: "", mobile: "", alternate_mobile: "",
  email: "", whatsapp: "", website: "", linkedin: "", address: "", city: "",
  state: "", country: "", pincode: "", notes: "",
};
