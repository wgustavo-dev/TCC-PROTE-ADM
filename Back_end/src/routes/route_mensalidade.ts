// Back_end/src/routes/route_mensalidade.ts

import { Router } from "express";
import { ControlMensalidade } from "../controllers/control_mensalidade";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";

const router = Router();

const controlMensalidade = new ControlMensalidade();

router.get("/mensalidades", authMiddleware, roleMiddleware(["CONDUTOR"]), (req, res) =>
  controlMensalidade.listar(req, res)
);

router.get("/mensalidades/:id", authMiddleware, roleMiddleware(["CONDUTOR"]), (req, res) =>
  controlMensalidade.buscarPorId(req, res)
);

router.post("/mensalidades", authMiddleware, roleMiddleware(["CONDUTOR"]), (req, res) =>
  controlMensalidade.criar(req, res)
);

/*
  ROTA AUXILIAR:
  Atualiza mensalidades vencidas com status PENDENTE para ATRASADO.

  Importante:
  Esta rota precisa vir antes de /mensalidades/:id,
  caso futuramente fosse criada com GET/PUT parecido.
*/
router.put("/mensalidades/atualizar-atrasadas", authMiddleware, roleMiddleware(["CONDUTOR"]), (req, res) =>
  controlMensalidade.atualizarAtrasadas(req, res)
);

/*
  ROTA AUXILIAR:
  Dispara manualmente a rotina de renovação mensal (gera mensalidade
  PENDENTE do mês atual para quem ainda não tem). O servidor já chama
  isso sozinho na virada do mês (ver server.ts); esta rota existe para
  forçar/testar sem esperar a virada real do mês.

  Mesmo motivo da rota acima: precisa vir antes de /mensalidades/:id.
*/
router.put("/mensalidades/renovar-mes", authMiddleware, roleMiddleware(["CONDUTOR"]), (req, res) =>
  controlMensalidade.renovarMes(req, res)
);

router.put("/mensalidades/:id/pagar", authMiddleware, roleMiddleware(["CONDUTOR"]), (req, res) =>
  controlMensalidade.marcarComoPago(req, res)
);

router.put("/mensalidades/:id", authMiddleware, roleMiddleware(["CONDUTOR"]), (req, res) =>
  controlMensalidade.atualizar(req, res)
);

router.delete("/mensalidades/:id", authMiddleware, roleMiddleware(["CONDUTOR"]), (req, res) =>
  controlMensalidade.deletar(req, res)
);

export default router;