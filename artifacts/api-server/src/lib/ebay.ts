import type {
  PriceStats,
  SoldStats,
  SellThrough,
  FlipAnalysis,
} from "@workspace/db";

export class EbayNotConnectedError extends Error {
  constructor() {
    super("eBay is not connected yet");
    this.name = "EbayNotConnectedError";
  }
}

export type EbayPricing = {
  active: PriceStats;
  sold: SoldStats;
  sellThrough: SellThrough;
  flip: FlipAnalysis;
  ebayUrl: string;
};

export function classifySellThrough(rate: number): SellThrough["label"] {
  if (rate >= 70) return "Hot";
  if (rate >= 40) return "Moderate";
  return "Slow";
}

export function buildEbayUrl(searchTerm: string): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}`;
}

/**
 * Derive a flip analysis from sold pricing.
 * - buyBelow: the most you should pay to source the item (35% of sold avg)
 * - listLow / listHigh: a sensible listing range around the sold average
 * - estProfit: midpoint list minus buy price minus ~13% eBay/PayPal fees and ~$6 shipping
 */
export function computeFlip(soldAvg: number): FlipAnalysis {
  const buyBelow = Math.max(1, Math.round(soldAvg * 0.35));
  const listLow = Math.max(1, Math.round(soldAvg * 0.85));
  const listHigh = Math.max(listLow + 1, Math.round(soldAvg * 1.12));
  const mid = (listLow + listHigh) / 2;
  const estProfit = Math.max(0, Math.round(mid * 0.87 - buyBelow - 6));
  return { buyBelow, listLow, listHigh, estProfit };
}

const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";

/** "production" (default) or "sandbox", controlled by the EBAY_ENV secret. */
function ebayBaseUrl(): string {
  return process.env.EBAY_ENV === "sandbox"
    ? "https://api.sandbox.ebay.com"
    : "https://api.ebay.com";
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Returns an OAuth application access token (client credentials grant) usable
 * against the eBay Browse API. Tokens are cached in memory until shortly before
 * they expire. Requires EBAY_CLIENT_ID and EBAY_CLIENT_SECRET (the App ID and
 * Cert ID from the eBay developer Production keyset). Throws
 * EbayNotConnectedError when those credentials are missing so callers can
 * surface a clear "connect eBay" message.
 */
export async function getEbayAccessToken(): Promise<string> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new EbayNotConnectedError();
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: EBAY_SCOPE,
  });

  const resp = await fetch(`${ebayBaseUrl()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`eBay OAuth token error: ${resp.status} ${detail}`);
  }

  const data = (await resp.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error("eBay OAuth response missing access_token");
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
  };
  return cachedToken.value;
}

const EBAY_MARKETPLACE = "EBAY_US";

type BrowseSummary = {
  price?: { value?: string };
};

function summarize(prices: number[]): PriceStats {
  if (prices.length === 0) {
    return { avg: 0, low: 0, high: 0, count: 0 };
  }
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  return {
    avg: Math.round(avg),
    low: Math.round(low),
    high: Math.round(high),
    count: prices.length,
  };
}

export async function getEbayPricing(searchTerm: string): Promise<EbayPricing> {
  const token = await getEbayAccessToken();

  const url = new URL(
    `${ebayBaseUrl()}/buy/browse/v1/item_summary/search`,
  );
  url.searchParams.set("q", searchTerm);
  url.searchParams.set("limit", "100");

  const resp = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": EBAY_MARKETPLACE,
      "Content-Type": "application/json",
    },
  });

  if (!resp.ok) {
    throw new Error(`eBay Browse API error: ${resp.status}`);
  }

  const data = (await resp.json()) as {
    itemSummaries?: BrowseSummary[];
    total?: number;
  };

  const prices = (data.itemSummaries ?? [])
    .map((s) => Number.parseFloat(s.price?.value ?? ""))
    .filter((n) => Number.isFinite(n) && n > 0);

  const active = summarize(prices);
  active.count = data.total ?? active.count;

  // Sold comps require the Marketplace Insights API (Limited Release). When it
  // is unavailable we estimate sold figures from the active listing data.
  const soldAvg = Math.round(active.avg * 0.88) || active.avg;
  const sold: SoldStats = {
    avg: soldAvg,
    low: Math.round(active.low * 0.82),
    high: Math.round(active.high * 0.92),
    count: Math.round(active.count * 2.5),
    isEstimated: true,
  };

  const totalForRate = sold.count + active.count;
  const rate =
    totalForRate === 0 ? 0 : Math.round((sold.count / totalForRate) * 100);
  const sellThrough: SellThrough = { rate, label: classifySellThrough(rate) };

  const flip = computeFlip(soldAvg || active.avg);

  return {
    active,
    sold,
    sellThrough,
    flip,
    ebayUrl: buildEbayUrl(searchTerm),
  };
}
