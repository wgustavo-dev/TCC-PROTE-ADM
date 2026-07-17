// Back_end/src/routes/route_escola.ts

import { Router } from "express";
import { ControlEscola } from "../controllers/control_escola";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();
const controlEscola = new ControlEscola();

router.get("/escolas", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlEscola.listar(req, res)
);

router.get("/escolas/:id", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlEscola.buscarPorID(req, res)
);

router.post("/escolas", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlEscola.criar(req, res)
);

router.put("/escolas/:id", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlEscola.atualizar(req, res)
);

router.delete("/escolas/:id", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlEscola.deletar(req, res)
);

export default router;
