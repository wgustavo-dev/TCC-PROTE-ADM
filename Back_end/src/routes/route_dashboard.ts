import { Router } from "express";
import { ControlDashboard } from "../controllers/control_dashboard";

const router = Router();
const controlDashboard = new ControlDashboard();

router.get("/dashboard/resumo", (req, res) =>
  controlDashboard.resumo(req, res)
);

export default router;