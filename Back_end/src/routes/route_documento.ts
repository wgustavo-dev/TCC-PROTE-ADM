import { Router } from 'express';
import { ControlDocumento } from '../controllers/control_documento';
import { authMiddleware } from '../middleware/authMiddleware';
import { roleMiddleware } from '../middleware/roleMiddleware';

const router = Router();
const controlDocumento = new ControlDocumento();

router.get('/documentos', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) => controlDocumento.listar(req, res));
router.get('/documentos/:id', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) => controlDocumento.buscarPorID(req, res));
router.post('/documentos', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) => controlDocumento.criar(req, res));
router.put('/documentos/:id', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) => controlDocumento.atualizar(req, res));
router.delete('/documentos/:id', authMiddleware, roleMiddleware(['CONDUTOR']), (req, res) => controlDocumento.deletar(req, res));

export default router;
