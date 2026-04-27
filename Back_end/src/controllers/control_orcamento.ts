import { Request, Response } from 'express';
import { ServiceOrcamento } from '../services/service_orcamento';

const service = new ServiceOrcamento();

export class ControlOrcamento {
  async listar(req: Request, res: Response) {
    try {
      const orcamentos = await service.listar();
      return res.json(orcamentos);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async buscarPorID(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orcamento = await service.buscarPorID(Number(id));
      return res.json(orcamento);
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const dados = req.body;
      const orcamento = await service.criar(dados);
      return res.status(201).json(orcamento);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dados = req.body;
      const orcamento = await service.atualizar(Number(id), dados);
      return res.json(orcamento);
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

  async aprovar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const resultado = await service.aprovar(Number(id));
      return res.json(resultado);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
