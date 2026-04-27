import { Router } from 'express';
import { ControlDocumento } from '../controllers/control_documento';

const router = Router();
const controlDocumento = new ControlDocumento();

router.get('/documentos', (req, res) => controlDocumento.listar(req, res));
router.get('/documentos/:id', (req, res) => controlDocumento.buscarPorID(req, res));
router.post('/documentos', (req, res) => controlDocumento.criar(req, res));
router.put('/documentos/:id', (req, res) => controlDocumento.atualizar(req, res));
router.delete('/documentos/:id', (req, res) => controlDocumento.deletar(req, res));

export default router;
