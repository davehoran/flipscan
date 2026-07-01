import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, savedItemsTable } from "@workspace/db";
import {
  CreateSavedItemBody,
  CreateSavedItemResponse,
  GetSavedItemParams,
  GetSavedItemResponse,
  DeleteSavedItemParams,
  ListSavedItemsResponse,
  GetStatsResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/saved-items", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(savedItemsTable)
    .where(eq(savedItemsTable.userId, req.userId!))
    .orderBy(desc(savedItemsTable.createdAt));
  res.json(ListSavedItemsResponse.parse(rows));
});

router.get("/stats", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(savedItemsTable)
    .where(eq(savedItemsTable.userId, req.userId!));

  const totalSaved = rows.length;
  const totalEstProfit = rows.reduce(
    (sum, r) => sum + (r.flip?.estProfit ?? 0),
    0,
  );
  const hotCount = rows.filter((r) => r.sellThrough?.label === "Hot").length;
  const avgSellThrough =
    totalSaved === 0
      ? 0
      : Math.round(
          rows.reduce((sum, r) => sum + (r.sellThrough?.rate ?? 0), 0) /
            totalSaved,
        );

  res.json(
    GetStatsResponse.parse({
      totalSaved,
      totalEstProfit,
      hotCount,
      avgSellThrough,
    }),
  );
});

router.post("/saved-items", requireAuth, async (req, res): Promise<void> => {
  // Pro-only feature
  const { getOrCreateSubscription, isProAccess } = await import("../lib/subscription");
  const sub = await getOrCreateSubscription(req.userId!);
  if (!isProAccess(sub.status)) {
    res.status(403).json({ error: "Pro feature", upgradeUrl: "/upgrade" });
    return;
  }

  const parsed = CreateSavedItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .insert(savedItemsTable)
    .values({ ...parsed.data, userId: req.userId! })
    .returning();

  res.status(201).json(CreateSavedItemResponse.parse(row));
});

router.get("/saved-items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSavedItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(savedItemsTable)
    .where(
      and(
        eq(savedItemsTable.id, params.data.id),
        eq(savedItemsTable.userId, req.userId!),
      ),
    );

  if (!row) {
    res.status(404).json({ error: "Saved item not found" });
    return;
  }

  res.json(GetSavedItemResponse.parse(row));
});

router.delete(
  "/saved-items/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteSavedItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [row] = await db
      .delete(savedItemsTable)
      .where(
        and(
          eq(savedItemsTable.id, params.data.id),
          eq(savedItemsTable.userId, req.userId!),
        ),
      )
      .returning();

    if (!row) {
      res.status(404).json({ error: "Saved item not found" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
