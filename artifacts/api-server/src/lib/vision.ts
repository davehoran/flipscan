import { openai } from "@workspace/integrations-openai-ai-server";

export type Identification = {
  name: string;
  category: string;
  confidence: number;
  searchTerm: string;
};

const SYSTEM_PROMPT = `You are an expert eBay reseller assistant. You are shown a single photo of a physical item that a reseller is considering flipping. Identify the item as specifically as possible (brand, model, variant) the way it would be titled in an eBay listing.

Respond with ONLY a JSON object (no markdown, no prose) with exactly these keys:
- "name": a concise, specific product title as it would appear on eBay (e.g. "Polaroid OneStep 2 Instant Camera"). Max ~70 chars.
- "category": the most fitting eBay-style category (e.g. "Cameras & Photo", "Video Games & Consoles", "Women's Bags & Handbags").
- "confidence": an integer 0-100 reflecting how confident you are in the identification.
- "searchTerm": a short, high-signal eBay keyword query to find comparable listings (brand + model + key qualifiers; no punctuation).

If the photo is too unclear to identify a sellable product, set confidence to a low value and make a best guess.`;

export async function identifyItem(imageDataUrl: string): Promise<Identification> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Identify this item for eBay resale and return the JSON.",
          },
          {
            type: "image_url",
            image_url: { url: imageDataUrl },
          },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Vision model returned unparseable output");
  }

  const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
  const category =
    typeof parsed.category === "string" ? parsed.category.trim() : "Other";
  const searchTerm =
    typeof parsed.searchTerm === "string" && parsed.searchTerm.trim()
      ? parsed.searchTerm.trim()
      : name;
  let confidence =
    typeof parsed.confidence === "number"
      ? Math.round(parsed.confidence)
      : Number.parseInt(String(parsed.confidence ?? "0"), 10) || 0;
  confidence = Math.max(0, Math.min(100, confidence));

  if (!name) {
    throw new Error("Could not identify an item in the photo");
  }

  return { name, category, confidence, searchTerm };
}
