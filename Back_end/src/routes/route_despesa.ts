import { Router } from 'express';
import { ControlDespesa } from '../controllers/control_despesa';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';

const router = Router();
const controlDespesa = new ControlDespesa();

router.get('/despesas', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) => controlDespesa.listar(req, res));
router.get('/despesas/:id', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) => controlDespesa.buscarPorID(req, res));
router.post('/despesas', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) => controlDespesa.criar(req, res));
router.put('/despesas/:id', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) => controlDespesa.atualizar(req, res));
router.delete('/despesas/:id', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) => controlDespesa.deletar(req, res));

export default router;
