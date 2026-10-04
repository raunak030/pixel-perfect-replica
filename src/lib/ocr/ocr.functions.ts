import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getOcrProvider } from "./providers.server";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export const extractCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ imageBase64: z.string().min(1).max(15_000_000), mimeType: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!ALLOWED.includes(data.mimeType)) throw new Error("Unsupported image type. Use JPG, PNG or WEBP.");
    return getOcrProvider().extract(data);
  });
