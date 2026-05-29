// Back_end/src/controllers/control_orcamento.ts

import { Request, Response } from 'express';
import { ServiceOrcamento } from '../services/service_orcamento';

const serviceOrcamento = new ServiceOrcamento();

export class ControlOrcamento {
  async listar(req: Request, res: Response) {
    try {
      const orcamentos = await serviceOrcamento.listar();
      return res.status(200).json(orcamentos);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Erro ao listar orçamentos',
      });
    }
  }

  async buscarPorID(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const orcamento = await serviceOrcamento.buscarPorID(Number(id));

      return res.status(200).json(orcamento);
    } catch (error: any) {
      return res.status(404).json({
        error: error.message || 'Erro ao buscar orçamento',
      });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const dados = req.body;

      const orcamento = await serviceOrcamento.criar(dados);

      return res.status(201).json(orcamento);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'Erro ao criar orçamento',
      });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dados = req.body;

      const orcamento = await serviceOrcamento.atualizar(Number(id), dados);

      return res.status(200).json(orcamento);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'Erro ao atualizar orçamento',
      });
    }
  }

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const resultado = await serviceOrcamento.deletar(Number(id));

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(404).json({
        error: error.message || 'Erro ao excluir orçamento',
      });
    }
  }

  async converter(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const resultado = await serviceOrcamento.converter(Number(id));

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'Erro ao iniciar conversão do orçamento',
      });
    }
  }

  async finalizarConversao(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const resultado = await serviceOrcamento.finalizarConversao(Number(id));

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'Erro ao finalizar conversão do orçamento',
      });
    }
  }

  async recusar(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const resultado = await serviceOrcamento.recusar(Number(id));

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(400).json({
        error: error.message || 'Erro ao recusar orçamento',
      });
    }
  }
}