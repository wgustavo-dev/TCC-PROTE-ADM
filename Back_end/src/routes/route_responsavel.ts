import { Router } from "express";
import { ControlResponsavel } from "../controllers/control_responsavel";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();
const controlResponsavel = new ControlResponsavel();

router.get("/responsaveis", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) => controlResponsavel.listar(req, res));
router.get("/responsaveis/:id", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlResponsavel.buscarPorID(req, res)
);
router.post("/responsaveis", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) => controlResponsavel.criar(req, res));
router.put("/responsaveis/:id", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlResponsavel.atualizar(req, res)
);
router.delete("/responsaveis/:id", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req, res) =>
  controlResponsavel.deletar(req, res)
);

export default router;
