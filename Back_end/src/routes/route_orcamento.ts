// Back_end/src/routes/route_orcamento.ts

import { Router } from 'express';
import { ControlOrcamento } from '../controllers/control_orcamento';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';

const router = Router();
const controlOrcamento = new ControlOrcamento();

router.get('/orcamentos', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) =>
  controlOrcamento.listar(req, res)
);

router.get('/orcamentos/:id', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) =>
  controlOrcamento.buscarPorID(req, res)
);

router.post('/orcamentos', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) =>
  controlOrcamento.criar(req, res)
);

router.put('/orcamentos/:id', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) =>
  controlOrcamento.atualizar(req, res)
);

router.delete('/orcamentos/:id', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) =>
  controlOrcamento.deletar(req, res)
);

/*
antiga rota "aprovar"
*/
router.put('/orcamentos/:id/converter', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) =>
  controlOrcamento.converter(req, res)
);

/*
  NOVA ROTA:
  Deve ser chamada somente no fim do fluxo,
  depois da mensalidade do último aluno.
*/
router.put('/orcamentos/:id/finalizar-conversao', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) =>
  controlOrcamento.finalizarConversao(req, res)
);

router.put('/orcamentos/:id/recusar', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) =>
  controlOrcamento.recusar(req, res)
);

export default router;