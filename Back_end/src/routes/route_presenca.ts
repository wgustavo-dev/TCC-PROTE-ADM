import { Router } from "express";
import { ControlPresenca } from "../controllers/control_presenca";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();
const controlPresenca = new ControlPresenca();
const roles = roleMiddleware(["CONDUTOR", "MONITOR"]);

router.get("/presencas", authMiddleware, roles, (req, res) =>
  controlPresenca.listar(req, res)
);

router.get("/presencas/data/:data/turno/:turno", authMiddleware, roles, (req, res) =>
  controlPresenca.listarPorDataTurno(req, res)
);

router.get("/presencas/data/:data", authMiddleware, roles, (req, res) =>
  controlPresenca.listarPorData(req, res)
);

router.post("/presencas", authMiddleware, roles, (req, res) =>
  controlPresenca.criar(req, res)
);

router.put("/presencas/:id", authMiddleware, roles, (req, res) =>
  controlPresenca.atualizar(req, res)
);

router.delete("/presencas/:id", authMiddleware, roles, (req, res) =>
  controlPresenca.deletar(req, res)
);

export default router;
