import { Router } from "express";
import { ControlResponsavel } from "../controllers/control_responsavel";

const router = Router();
const controlResponsavel = new ControlResponsavel();

router.get("/responsaveis", (req, res) => controlResponsavel.listar(req, res));
router.get("/responsaveis/:id", (req, res) =>
  controlResponsavel.buscarPorID(req, res)
);
router.post("/responsaveis", (req, res) => controlResponsavel.criar(req, res));
router.put("/responsaveis/:id", (req, res) =>
  controlResponsavel.atualizar(req, res)
);
router.delete("/responsaveis/:id", (req, res) =>
  controlResponsavel.deletar(req, res)
);

export default router;
