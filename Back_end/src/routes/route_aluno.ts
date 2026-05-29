import {Router} from "express";
import {ControlAluno} from "../controllers/control_aluno";
import { uploadAluno } from "../config/upload";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();
const controlAluno= new ControlAluno();

router.get("/responsaveis", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req,res)=> controlAluno.listarResponsaveis(req,res));

//busca todos os alunos
router.get("/alunos", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req,res)=> controlAluno.listar(req,res));
//busca 1 aluno
router.get("/alunos/:id", (req,res)=> controlAluno.buscarPorID(req,res));
//cria novo aluno
router.post("/alunos", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), uploadAluno.single("foto"), (req, res) =>
  controlAluno.criar(req, res)
);
//edita aluno existente
router.put("/alunos/:id", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), uploadAluno.single("foto"), (req,res)=> controlAluno.atualizar(req,res));
//deleta aluno
router.delete("/alunos/:id", authMiddleware, roleMiddleware(["CONDUTOR", "MONITOR"]), (req,res)=> controlAluno.deletar(req,res));

export default router