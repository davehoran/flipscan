import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanRouter from "./scan";
import savedItemsRouter from "./savedItems";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scanRouter);
router.use(savedItemsRouter);

export default router;
