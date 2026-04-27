import { Router } from 'express';
import { ControlOrcamento } from '../controllers/control_orcamento';

const router = Router();
const controlOrcamento = new ControlOrcamento();

router.get('/orcamentos', (req, res) => controlOrcamento.listar(req, res));
router.get('/orcamentos/:id', (req, res) => controlOrcamento.buscarPorID(req, res));
router.post('/orcamentos', (req, res) => controlOrcamento.criar(req, res));
router.put('/orcamentos/:id', (req, res) => controlOrcamento.atualizar(req, res));
router.delete('/orcamentos/:id', (req, res) => controlOrcamento.deletar(req, res));
router.put('/orcamentos/:id/aprovar', (req, res) => controlOrcamento.aprovar(req, res));

export default router;
