import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { AnalyzeItemBody, AnalyzeItemResponse } from "@workspace/api-zod";
import { db, scanUsageTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { identifyItem, UnidentifiableItemError } from "../lib/vision";
import { getEbayPricing, EbayNotConnectedError } from "../lib/ebay";
import { getOrCreateSubscription, isProAccess } from "../lib/subscription";

const router: IRouter = Router();

const FREE_DAILY_LIMIT = 5;

router.post("/scan", requireAuth, async (req, res): Promise<void> => {
  const parsed = AnalyzeItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Subscription enforcement
  const sub = await getOrCreateSubscription(req.userId!);
  if (!isProAccess(sub.status)) {
    // Check and enforce daily scan limit
    const today = new Date().toISOString().slice(0, 10);
    const [usage] = await db
      .select()
      .from(scanUsageTable)
      .where(
        and(
          eq(scanUsageTable.userId, req.userId!),
          eq(scanUsageTable.scanDate, today),
        ),
      );

    const currentCount = usage?.count ?? 0;
    if (currentCount >= FREE_DAILY_LIMIT) {
      res.status(429).json({
        error: "Daily scan limit reached",
        scansUsed: currentCount,
        scansLimit: FREE_DAILY_LIMIT,
        upgradeUrl: "/upgrade",
      });
      return;
    }

    // Increment scan count
    await db
      .insert(scanUsageTable)
      .values({ userId: req.userId!, scanDate: today, count: 1 })
      .onConflictDoUpdate({
        target: [scanUsageTable.userId, scanUsageTable.scanDate],
        set: { count: sql`scan_usage.count + 1` },
      });
  }

  let identification;
  try {
    identification = await identifyItem(parsed.data.image);
  } catch (err) {
    if (err instanceof UnidentifiableItemError) {
      req.log.warn({ err }, "Item could not be identified");
      res
        .status(422)
        .json({ error: "Couldn't identify that item — try another angle." });
      return;
    }
    req.log.error({ err }, "Vision service failure during identification");
    res.status(502).json({
      error: "Item identification is temporarily unavailable. Please try again.",
    });
    return;
  }

  try {
    const pricing = await getEbayPricing(identification.searchTerm);
    res.json(
      AnalyzeItemResponse.parse({
        name: identification.name,
        category: identification.category,
        confidence: identification.confidence,
        searchTerm: identification.searchTerm,
        active: pricing.active,
        sold: pricing.sold,
        sellThrough: pricing.sellThrough,
        flip: pricing.flip,
        ebayUrl: pricing.ebayUrl,
      }),
    );
  } catch (err) {
    if (err instanceof EbayNotConnectedError) {
      req.log.warn("eBay not connected — scan unavailable");
      res.status(503).json({
        error:
          "eBay isn't connected yet. Use the Demo button to explore, or connect eBay to scan live items.",
      });
      return;
    }
    req.log.error({ err }, "eBay pricing lookup failed");
    res.status(502).json({
      error: "eBay pricing is temporarily unavailable. Please try again.",
    });
  }
});

export default router;
