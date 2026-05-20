// Back_end/src/routes/route_orcamento.ts

import { Router } from 'express';
import { ControlOrcamento } from '../controllers/control_orcamento';

const router = Router();
const controlOrcamento = new ControlOrcamento();

router.get('/orcamentos', (req, res) =>
  controlOrcamento.listar(req, res)
);

router.get('/orcamentos/:id', (req, res) =>
  controlOrcamento.buscarPorID(req, res)
);

router.post('/orcamentos', (req, res) =>
  controlOrcamento.criar(req, res)
);

router.put('/orcamentos/:id', (req, res) =>
  controlOrcamento.atualizar(req, res)
);

router.delete('/orcamentos/:id', (req, res) =>
  controlOrcamento.deletar(req, res)
);

/*
antiga rota "aprovar"
*/
router.put('/orcamentos/:id/converter', (req, res) =>
  controlOrcamento.converter(req, res)
);

/*
  NOVA ROTA:
  Deve ser chamada somente no fim do fluxo,
  depois da mensalidade do último aluno.
*/
router.put('/orcamentos/:id/finalizar-conversao', (req, res) =>
  controlOrcamento.finalizarConversao(req, res)
);

router.put('/orcamentos/:id/recusar', (req, res) =>
  controlOrcamento.recusar(req, res)
);

export default router;