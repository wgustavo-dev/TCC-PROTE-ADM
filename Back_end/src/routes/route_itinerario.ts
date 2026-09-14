import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";
import { ControlItinerario } from "../controllers/control_itinerario";

const router = Router();
const controlItinerario = new ControlItinerario();

router.get("/itinerarios", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlItinerario.listar(req, res)
);

router.put("/itinerarios/ordem", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlItinerario.atualizarOrdem(req, res)
);

export default router;
