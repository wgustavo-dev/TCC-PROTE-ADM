import { AppDataSource } from '../config/database';
import { Documento } from '../models/model_documento';

export type StatusDocumento = 'Em dia' | 'Vence em breve' | 'Vence hoje' | 'Vencido';

function obterDataLocal(data?: Date | string | null) {
  if (!data) return null;
  const dataIso = String(data).slice(0, 10);
  const [ano, mes, dia] = dataIso.split('-').map(Number);

  if (!ano || !mes || !dia) return null;

  const dataLocal = new Date(ano, mes - 1, dia);
  dataLocal.setHours(0, 0, 0, 0);
  return dataLocal;
}

export function calcularDiasRestantes(dataValidade?: Date | string | null) {
  const validade = obterDataLocal(dataValidade);

  if (!validade) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return Math.round((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function calcularStatusDocumento(dataValidade?: Date | string | null): StatusDocumento {
  const diasRestantes = calcularDiasRestantes(dataValidade);

  if (diasRestantes === null) return 'Em dia';
  if (diasRestantes < 0) return 'Vencido';
  if (diasRestantes === 0) return 'Vence hoje';
  if (diasRestantes <= 7) return 'Vence em breve';
  return 'Em dia';
}

export function incluirStatusDocumento(documento: Documento) {
  const diasRestantes = calcularDiasRestantes(documento.data_validade);

  return {
    ...documento,
    status: calcularStatusDocumento(documento.data_validade),
    diasRestantes,
  };
}

export class ServiceDocumento {
  async listar() {
    const documentoRepository = AppDataSource.getRepository(Documento);
    const documentos = await documentoRepository.find({
      relations: {
        condutor: true,
      },
    });

    return documentos.map(incluirStatusDocumento);
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

    return incluirStatusDocumento(documento);
  }

  async criar(dados: Partial<Documento>) {
    const documentoRepository = AppDataSource.getRepository(Documento);
    const documento = documentoRepository.create(dados);
    await documentoRepository.save(documento);

    return incluirStatusDocumento(documento);
  }

  async atualizar(id: number, dados: Partial<Documento>) {
    const documentoRepository = AppDataSource.getRepository(Documento);
    const documento = await documentoRepository.findOneBy({ id_documento: id });

    if (!documento) {
      throw new Error('Documento não encontrado');
    }

    documentoRepository.merge(documento, dados);
    await documentoRepository.save(documento);

    return incluirStatusDocumento(documento);
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
