import { AppDataSource } from '../config/database';
import { Documento } from '../models/model_documento';

export class ServiceDocumento {
  async listar() {
    const documentoRepository = AppDataSource.getRepository(Documento);
    return documentoRepository.find({
      relations: {
        condutor: true,
      },
    });
  }

  async buscarPorID(id: number) {
    const documentoRepository = AppDataSource.getRepository(Documento);
    const documento = await documentoRepository.findOne({
      where: { id_documento: id },
      relations: {
        condutor: true,
      },
    });

    if (!documento) {
      throw new Error('Documento não encontrado');
    }

    return documento;
  }

  async criar(dados: Partial<Documento>) {
    const documentoRepository = AppDataSource.getRepository(Documento);
    const documento = documentoRepository.create(dados);
    await documentoRepository.save(documento);

    return documento;
  }

  async atualizar(id: number, dados: Partial<Documento>) {
    const documentoRepository = AppDataSource.getRepository(Documento);
    const documento = await documentoRepository.findOneBy({ id_documento: id });

    if (!documento) {
      throw new Error('Documento não encontrado');
    }

    documentoRepository.merge(documento, dados);
    await documentoRepository.save(documento);

    return documento;
  }

  async deletar(id_documento: number) {
    const documentoRepository = AppDataSource.getRepository(Documento);
    const documento = await documentoRepository.findOneBy({ id_documento });

    if (!documento) {
      throw new Error('Documento não encontrado');
    }

    await documentoRepository.remove(documento);
    return { message: 'Documento excluído com sucesso' };
  }
}
