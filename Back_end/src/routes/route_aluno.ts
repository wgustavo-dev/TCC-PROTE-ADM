import {Router} from "express";
import {ControlAluno} from "../controllers/control_aluno";

const router = Router();
const controlAluno= new ControlAluno();

//busca todos os alunos
router.get("/alunos", (req,res)=> controlAluno.listar(req,res));
//busca 1 aluno
router.get("/alunos/:id", (req,res)=> controlAluno.buscarPorID(req,res));
//cria novo aluno
router.post("/alunos", (req,res)=> controlAluno.criar(req,res));
//edita aluno existente
router.put("/alunos/:id", (req,res)=> controlAluno.atualizar(req,res));
//deleta aluno
router.delete("/alunos/:id", (req,res)=> controlAluno.deletar(req,res));

export default router