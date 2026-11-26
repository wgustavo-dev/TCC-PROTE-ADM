
import { Request, Response } from 'express';
import { ServiceDocumento } from '../services/service_documento';

const service = new ServiceDocumento();

export class ControlDocumento {

  async listar(req: Request, res: Response) {
    try {
      const documentos = await service.listar();
      return res.status(200).json(documentos);
    } catch (error: any) {
      console.error('Erro ao listar documentos:', error);
      return res.status(500).json({
        error: 'Erro ao listar documentos.'
      });
    }
  }

  async buscarPorID(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          error: 'ID do documento inválido.'
        });
      }

      const documento = await service.buscarPorID(id);
      return res.status(200).json(documento);

    } catch (error: any) {
      console.error('Erro ao buscar documento:', error);
      return res.status(404).json({
        error: error.message
      });
    }
  }

  async criar(req: Request, res: Response) {
    try {
      const dados = req.body;

      const documento = await service.criar(dados);

      return res.status(201).json(documento);

    } catch (error: any) {
      console.error('Erro ao criar documento:', error);
      return res.status(400).json({
        error: error.message
      });
    }
  }

  async atualizar(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          error: 'ID do documento inválido.'
        });
      }

      const dados = req.body;

      const documento = await service.atualizar(id, dados);

      return res.status(200).json(documento);

    } catch (error: any) {
      console.error('Erro ao atualizar documento:', error);
      return res.status(400).json({
        error: error.message
      });
    }
  }

  async deletar(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          error: 'ID do documento inválido.'
        });
      }

      const resultado = await service.deletar(id);

      return res.status(200).json(resultado);

    } catch (error: any) {
      console.error('Erro ao deletar documento:', error);
      return res.status(404).json({
        error: error.message
      });
    }
  }
}
