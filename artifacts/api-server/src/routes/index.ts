import { Router, type IRouter } from "express";
import healthRouter from "./health";
import partsRouter from "./parts";
import categoriesRouter from "./categories";
import stockRouter from "./stock";
import expensesRouter from "./expenses";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/parts", partsRouter);
router.use("/categories", categoriesRouter);
router.use("/stock-movements", stockRouter);
router.use("/expenses", expensesRouter);
router.use("/dashboard", dashboardRouter);
router.use("/reports", reportsRouter);

export default router;
