import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanRouter from "./scan";
import savedItemsRouter from "./savedItems";
import ebayAccountDeletionRouter from "./ebayAccountDeletion";
import billingRouter from "./billing";
import referralRouter from "./referral";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scanRouter);
router.use(savedItemsRouter);
router.use(ebayAccountDeletionRouter);
router.use(billingRouter);
router.use(referralRouter);

export default router;
