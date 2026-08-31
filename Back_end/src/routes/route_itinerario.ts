import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";
import { ControlItinerario } from "../controllers/control_itinerario";

const router = Router();
const controlItinerario = new ControlItinerario();
const roles = roleMiddleware(["CONDUTOR", "MONITOR"]);

// GET /api/itinerarios
// A rota ativa usa o Controller/Service do módulo para que
// sincronizarTodos() seja executado antes da consulta.
router.get(
  "/itinerarios",
  authMiddleware,
  roles,
  (req: AuthRequest, res: Response) => controlItinerario.listar(req, res)
);

// PUT /api/itinerarios/ordem
router.put(
  "/itinerarios/ordem",
  authMiddleware,
  roles,
  (req: AuthRequest, res: Response) => controlItinerario.atualizarOrdem(req, res)
);

export default router;
