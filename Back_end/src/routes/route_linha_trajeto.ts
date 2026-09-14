import { Router } from "express";
import { ControlLinhaTrajeto } from "../controllers/control_linha_trajeto";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();
const controller = new ControlLinhaTrajeto();

router.get(
  "/linha-trajeto",
  authMiddleware,
  roleMiddleware(["CONDUTOR", "MONITOR"]),
  (req, res) => controller.listar(req, res)
);

export default router;
