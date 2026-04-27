import { Router } from 'express';
import { ControlDespesa } from '../controllers/control_despesa';

const router = Router();
const controlDespesa = new ControlDespesa();

router.get('/despesas', (req, res) => controlDespesa.listar(req, res));
router.get('/despesas/:id', (req, res) => controlDespesa.buscarPorID(req, res));
router.post('/despesas', (req, res) => controlDespesa.criar(req, res));
router.put('/despesas/:id', (req, res) => controlDespesa.atualizar(req, res));
router.delete('/despesas/:id', (req, res) => controlDespesa.deletar(req, res));

export default router;
