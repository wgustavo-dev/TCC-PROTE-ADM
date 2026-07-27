import { Request, Response } from 'express';
import { ServiceDespesa } from '../services/service_despesa';

const service = new ServiceDespesa();

export class ControlDespesa {
  async listar(req: Request, res: Response) {
    try {
      const despesas = await service.listar();
      return res.json(despesas);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async buscarPorID(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const despesa = await service.buscarPorID(Number(id));
      return res.json(despesa);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const dados = req.body;
      const despesa = await service.criar(dados);
      return res.status(201).json(despesa);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dados = req.body;
      const despesa = await service.atualizar(Number(id), dados);
      return res.json(despesa);
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
