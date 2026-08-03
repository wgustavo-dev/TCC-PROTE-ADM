import { Router } from "express";
import { ControlAcessos } from "../controllers/control_acessos";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();
const controlAcessos = new ControlAcessos();

// Somente CONDUTOR pode acessar Controle de Acessos (Monitor não pode
// nem visualizar, muito menos cadastrar usuários).

// lista condutores e monitores ativos em uma única lista
router.get(
  "/acessos",
  authMiddleware,
  roleMiddleware(["CONDUTOR"]),
  (req, res) => controlAcessos.listar(req, res)
);

// cria condutor ou monitor (definido pelo campo "acesso" enviado no corpo)
router.post(
  "/acessos",
  authMiddleware,
  roleMiddleware(["CONDUTOR"]),
  (req, res) => controlAcessos.criar(req, res)
);

// edita um condutor ou monitor existente
router.put(
  "/acessos/:tipo/:id",
  authMiddleware,
  roleMiddleware(["CONDUTOR"]),
  (req, res) => controlAcessos.atualizar(req, res)
);

// exclusão lógica (ativo = false), nunca remove a linha do banco
router.delete(
  "/acessos/:tipo/:id",
  authMiddleware,
  roleMiddleware(["CONDUTOR"]),
  (req, res) => controlAcessos.deletar(req, res)
);

export default router;
