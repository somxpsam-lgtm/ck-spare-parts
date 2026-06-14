import { Router, type IRouter } from "express";
import healthRouter from "./health";
import partsRouter from "./parts";
import categoriesRouter from "./categories";
import stockRouter from "./stock";
import expensesRouter from "./expenses";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import uploadsRouter from "./uploads";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/parts", partsRouter);
router.use("/categories", categoriesRouter);
router.use("/stock-movements", stockRouter);
router.use("/expenses", expensesRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportsRouter);
router.use("/uploads", uploadsRouter);
router.use("/settings", settingsRouter);

export default router;
