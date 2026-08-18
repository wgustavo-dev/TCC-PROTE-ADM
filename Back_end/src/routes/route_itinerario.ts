// Back_end/src/routes/route_itinerario.ts
//
// REFEITO DO ZERO: segue agora o mesmo padrão do resto do sistema
// (ex.: route_presenca.ts) — Router + Controller, sem SQL nem lógica
// de negócio aqui dentro. As paths não incluem "/api": o prefixo é
// adicionado no routes/index.ts (routes.use('/api', routeItinerario)).

import { Router } from "express";
import { ControlItinerario } from "../controllers/control_itinerario";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();
const controlItinerario = new ControlItinerario();

router.get("/itinerarios", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlItinerario.listar(req, res)
);

router.put("/itinerarios/ordem", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlItinerario.atualizarOrdem(req, res)
);

export default router;