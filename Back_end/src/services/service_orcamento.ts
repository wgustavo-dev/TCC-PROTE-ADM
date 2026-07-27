import { AppDataSource } from '../config/database';
import { Orcamento } from '../models/model_orcamento';

export class ServiceOrcamento {
  async listar() {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);

    return await orcamentoRepository.find({
      relations: {
        condutor: true,
      },
      order: {
        id_orcamento: 'DESC',
      },
    });
  }

  async buscarPorID(id: number) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);

    const orcamento = await orcamentoRepository.findOne({
      where: { id_orcamento: id },
      relations: {
        condutor: true,
      },
    });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    return orcamento;
  }

  async criar(dados: Partial<Orcamento>) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);

    if (!dados.nome_responsavel) {
      throw new Error('Nome do responsável é obrigatório');
    }

    if (!dados.telefone) {
      throw new Error('Telefone é obrigatório');
    }

    if (!dados.quantidade_alunos || dados.quantidade_alunos < 1) {
      throw new Error('Quantidade de alunos deve ser pelo menos 1');
    }

    const orcamento = orcamentoRepository.create({
      nome_responsavel: dados.nome_responsavel,
      telefone: dados.telefone,
      bairro: dados.bairro,
      escola: dados.escola,
      turno: dados.turno,
      quantidade_alunos: dados.quantidade_alunos,
      tipo_trajeto: dados.tipo_trajeto,
      endereco_embarque: dados.endereco_embarque,
      endereco_desembarque: dados.endereco_desembarque,
      valor: dados.valor,
      status: 'PENDENTE',
      convertido: false,
      data_solicitacao: dados.data_solicitacao || new Date(),
      data_conversao: null as any,
      id_condutor: dados.id_condutor,
    });

    return await orcamentoRepository.save(orcamento);
  }

  async atualizar(id: number, dados: Partial<Orcamento>) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);

    const orcamento = await orcamentoRepository.findOneBy({
      id_orcamento: id,
    });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    if (
      dados.quantidade_alunos !== undefined &&
      dados.quantidade_alunos < 1
    ) {
      throw new Error('Quantidade de alunos deve ser pelo menos 1');
    }

    if (dados.nome_responsavel !== undefined) {
      orcamento.nome_responsavel = dados.nome_responsavel;
    }

    if (dados.telefone !== undefined) {
      orcamento.telefone = dados.telefone;
    }

    if (dados.bairro !== undefined) {
      orcamento.bairro = dados.bairro;
    }

    if (dados.escola !== undefined) {
      orcamento.escola = dados.escola;
    }

    if (dados.turno !== undefined) {
      orcamento.turno = dados.turno;
    }

    if (dados.quantidade_alunos !== undefined) {
      orcamento.quantidade_alunos = dados.quantidade_alunos;
    }

    if (dados.tipo_trajeto !== undefined) {
      orcamento.tipo_trajeto = dados.tipo_trajeto;
    }

    if (dados.endereco_embarque !== undefined) {
      orcamento.endereco_embarque = dados.endereco_embarque;
    }

    if (dados.endereco_desembarque !== undefined) {
      orcamento.endereco_desembarque = dados.endereco_desembarque;
    }

    if (dados.valor !== undefined) {
      orcamento.valor = dados.valor;
    }

    if (dados.id_condutor !== undefined) {
      orcamento.id_condutor = dados.id_condutor;
    }

    return await orcamentoRepository.save(orcamento);
  }

  async deletar(id_orcamento: number) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);

    const orcamento = await orcamentoRepository.findOneBy({
      id_orcamento,
    });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    await orcamentoRepository.remove(orcamento);

    return {
      message: 'Orçamento excluído com sucesso',
    };
  }

  async converter(id: number) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);

    const orcamento = await orcamentoRepository.findOneBy({
      id_orcamento: id,
    });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    if (orcamento.status === 'RECUSADO') {
      throw new Error('Não é possível converter um orçamento recusado');
    }

    if (orcamento.status === 'CONVERTIDO' || orcamento.convertido) {
      throw new Error('Orçamento já convertido');
    }

    if (orcamento.status === 'EM_CADASTRO') {
      return {
        message: 'Orçamento já está em cadastro',
        orcamento,
      };
    }

    orcamento.status = 'EM_CADASTRO';
    orcamento.convertido = false;
    orcamento.data_conversao = null as any;

    await orcamentoRepository.save(orcamento);

    return {
      message: 'Conversão iniciada com sucesso',
      orcamento,
    };
  }

  async finalizarConversao(id: number) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);

    const orcamento = await orcamentoRepository.findOneBy({
      id_orcamento: id,
    });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    if (orcamento.status === 'RECUSADO') {
      throw new Error('Não é possível finalizar um orçamento recusado');
    }

    if (orcamento.status === 'CONVERTIDO' || orcamento.convertido) {
      return {
        message: 'Orçamento já estava convertido',
        orcamento,
      };
    }

    orcamento.status = 'CONVERTIDO';
    orcamento.convertido = true;
    orcamento.data_conversao = new Date();

    await orcamentoRepository.save(orcamento);

    return {
      message: 'Orçamento convertido com sucesso',
      orcamento,
    };
  }

  async recusar(id: number) {
    const orcamentoRepository = AppDataSource.getRepository(Orcamento);

    const orcamento = await orcamentoRepository.findOneBy({
      id_orcamento: id,
    });

    if (!orcamento) {
      throw new Error('Orçamento não encontrado');
    }

    if (orcamento.status === 'CONVERTIDO' || orcamento.convertido) {
      throw new Error('Não é possível recusar um orçamento já convertido');
    }

    orcamento.status = 'RECUSADO';
    orcamento.convertido = false;

    await orcamentoRepository.save(orcamento);

    return {
      message: 'Orçamento recusado com sucesso',
      orcamento,
    };
  }
}