import { Request, Response } from 'express';
import { ServiceDocumento } from '../services/service_documento';

const service = new ServiceDocumento();

export class ControlDocumento {
  async listar(req: Request, res: Response) {
    try {
      const documentos = await service.listar();
      return res.json(documentos);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async buscarPorID(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const documento = await service.buscarPorID(Number(id));
      return res.json(documento);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const dados = req.body;
      const documento = await service.criar(dados);
      return res.status(201).json(documento);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dados = req.body;
      const documento = await service.atualizar(Number(id), dados);
      return res.json(documento);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const resultado = await service.deletar(Number(id));
      return res.json(resultado);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }
}
