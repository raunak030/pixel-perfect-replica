import { describe, expect, it } from "vitest";
import { parseCardText } from "@/lib/ocr/parse";

const SAMPLE = `Ananya Rao
Head of Partnerships
GreenLeaf AgriTech Pvt Ltd
42, 3rd Cross, Indiranagar, Bengaluru, Karnataka 560038
+91 98450 12345
ananya@greenleaf.in
greenleaf.in
linkedin.com/in/ananyarao`;

describe("parseCardText", () => {
  it("extracts structured fields from a typical card", () => {
    const d = parseCardText(SAMPLE);
    expect(d.full_name).toBe("Ananya Rao");
    expect(d.designation).toBe("Head of Partnerships");
    expect(d.company_name).toBe("GreenLeaf AgriTech Pvt Ltd");
    expect(d.mobile).toBe("+91 98450 12345");
    expect(d.email).toBe("ananya@greenleaf.in");
    expect(d.website).toBe("greenleaf.in");
    expect(d.linkedin).toBe("linkedin.com/in/ananyarao");
    expect(d.city).toBe("Bengaluru");
    expect(d.state).toBe("Karnataka");
    expect(d.pincode).toBe("560038");
  });

  it("splits two phone numbers into mobile + alternate", () => {
    const d = parseCardText("Rahul Mehta\nFarmFresh Foods\n+91 99200 55511\n022 4890 1122");
    expect(d.mobile).toBe("+91 99200 55511");
    expect(d.alternate_mobile).toBe("022 4890 1122");
  });

  it("returns empty fields (not garbage) for unreadable input", () => {
    const d = parseCardText("~~~ ### \n...,,,");
    expect(d.email).toBe("");
    expect(d.mobile).toBe("");
  });

  it("preserves unmatched lines in notes", () => {
    const d = parseCardText("Priya Sharma\nSeedline Capital\nMet at UPITS Expo");
    expect(d.notes).toContain("UPITS Expo");
  });
});
