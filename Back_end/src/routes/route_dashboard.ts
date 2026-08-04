import { Router } from "express";
import { ControlDashboard } from "../controllers/control_dashboard";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();
const controlDashboard = new ControlDashboard();

router.get(
  "/dashboard/resumo",
  authMiddleware,
  roleMiddleware(["CONDUTOR"]),
  (req, res) => controlDashboard.resumo(req, res)
);

export default router;