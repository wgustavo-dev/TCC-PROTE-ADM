import { AppDataSource } from '../config/database';
import { Orcamento } from '../models/model_orcamento';

export class ServiceOrcamento {
  private normalizarTextoCurto(
    valor: unknown,
    campo: string,
    limite: number
  ): string {
    const texto = String(valor ?? '').trim();

    if (!texto) {
      throw new Error(`${campo} não pode ficar vazio`);
    }

    if (texto.length > limite) {
      throw new Error(`${campo} deve ter no máximo ${limite} caracteres`);
    }

    return texto;
  }

  private normalizarTurno(valor: unknown): 'MANHA' | 'TARDE' | null {
    const turno = String(valor ?? '').trim().toUpperCase();

    if (!turno) return null;
    if (turno === 'MANHA' || turno === 'TARDE') return turno;

    throw new Error('Turno inválido. Use MANHA ou TARDE.');
  }

  private normalizarTipoTrajeto(
    valor: unknown
  ): 'IDA' | 'VOLTA' | 'AMBOS' | null {
    const tipo = String(valor ?? '').trim().toUpperCase();

    if (!tipo) return null;
    if (tipo === 'IDA' || tipo === 'VOLTA' || tipo === 'AMBOS') return tipo;

    throw new Error('Tipo de trajeto inválido. Use IDA, VOLTA ou AMBOS.');
  }

  private normalizarEndereco(valor: unknown, campo: string): string | null {
    const endereco = String(valor ?? '').trim();

    if (!endereco) return null;
    if (endereco.length > 255) {
      throw new Error(`${campo} deve ter no máximo 255 caracteres`);
    }

    return endereco;
  }

  private normalizarValor(valor: unknown): number | null {
    if (valor === undefined || valor === null || valor === '') return null;

    const numero = typeof valor === 'string'
      ? Number(valor.replace(',', '.'))
      : Number(valor);

    if (!Number.isFinite(numero) || numero < 0) {
      throw new Error('Valor inválido');
    }

    return numero;
  }

  async listar() {
    const orcamentoRepository =
      AppDataSource.getRepository(Orcamento);

    return await orcamentoRepository.find({
      relations: {
        condutor: true,
      },
      order: {
        id_orcamento: 'DESC',
      },
    });
  }

  // =========================================================
  // BUSCAR POR ID
  // =========================================================

  async buscarPorID(id: number) {
    const orcamentoRepository =
      AppDataSource.getRepository(Orcamento);

    const orcamento =
      await orcamentoRepository.findOne({
        where: {
          id_orcamento: id,
        },
        relations: {
          condutor: true,
        },
      });

    if (!orcamento) {
      throw new Error(
        'Orçamento não encontrado'
      );
    }

    return orcamento;
  }

  // =========================================================
  // CRIAR
  // =========================================================

  async criar(dados: Partial<Orcamento>) {

    const orcamentoRepository =
      AppDataSource.getRepository(Orcamento);

    if (!dados.nome_responsavel) {
      throw new Error('Nome do responsável é obrigatório');
    }

    if (!dados.telefone) {
      throw new Error('Telefone é obrigatório');
    }

    if (!dados.quantidade_alunos || dados.quantidade_alunos < 1) {
      throw new Error('Quantidade de alunos deve ser pelo menos 1');
    }

    const bairro = dados.bairro !== undefined ? this.normalizarTextoCurto(dados.bairro, 'Bairro', 100) : null;
    const escola = dados.escola !== undefined ? this.normalizarTextoCurto(dados.escola, 'Escola', 150) : null;
    const turno = this.normalizarTurno(dados.turno);
    const tipoTrajeto = this.normalizarTipoTrajeto(dados.tipo_trajeto);
    const embarque = dados.endereco_embarque !== undefined ? this.normalizarEndereco(dados.endereco_embarque, 'Endereço de embarque') : null;
    const desembarque = dados.endereco_desembarque !== undefined ? this.normalizarEndereco(dados.endereco_desembarque, 'Endereço de desembarque') : null;
    const valor = this.normalizarValor(dados.valor);

    const orcamento = orcamentoRepository.create({
      nome_responsavel: dados.nome_responsavel.trim(),
      telefone: dados.telefone,
      bairro,
      escola,
      turno,
      quantidade_alunos: dados.quantidade_alunos,
      tipo_trajeto: tipoTrajeto,
      endereco_embarque: embarque,
      endereco_desembarque: desembarque,
      valor,
      status: 'PENDENTE',
      convertido: false,
      data_solicitacao: dados.data_solicitacao || new Date(),
      data_conversao: null as any,
      id_condutor: dados.id_condutor,
    });

    return await orcamentoRepository.save(
      orcamento
    );
  }

  // =========================================================
  // ATUALIZAR
  // =========================================================

  async atualizar(
    id: number,
    dados: Partial<Orcamento>
  ) {

    const orcamentoRepository =
      AppDataSource.getRepository(Orcamento);

    const orcamento =
      await orcamentoRepository.findOneBy({
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

    // -------------------------------------------------------
    // Telefone
    // -------------------------------------------------------

    if (dados.telefone !== undefined) {
      orcamento.telefone = dados.telefone;
    }

    // -------------------------------------------------------
    // Bairro
    // -------------------------------------------------------

    if (dados.bairro !== undefined) {
      orcamento.bairro = dados.bairro;
    }

    if (dados.escola !== undefined) {
      orcamento.escola = dados.escola;
    }

    if (dados.turno !== undefined) {
      orcamento.turno = dados.turno;
    }

    // -------------------------------------------------------
    // Quantidade de alunos
    // -------------------------------------------------------

    if (dados.quantidade_alunos !== undefined) {
      orcamento.quantidade_alunos = dados.quantidade_alunos;
    }

    // -------------------------------------------------------
    // Tipo de trajeto
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // Condutor
    // -------------------------------------------------------

    if (
      dados.id_condutor !== undefined
    ) {
      orcamento.id_condutor =
        dados.id_condutor;
    }

    // -------------------------------------------------------
    // Salvar
    // -------------------------------------------------------

    return await orcamentoRepository.save(
      orcamento
    );
  }

  // =========================================================
  // DELETAR
  // =========================================================

  async deletar(
    id_orcamento: number
  ) {

    const orcamentoRepository =
      AppDataSource.getRepository(Orcamento);

    const orcamento =
      await orcamentoRepository.findOneBy({
        id_orcamento,
      });

    if (!orcamento) {
      throw new Error(
        'Orçamento não encontrado'
      );
    }

    await orcamentoRepository.remove(
      orcamento
    );

    return {
      message:
        'Orçamento excluído com sucesso',
    };
  }

  // =========================================================
  // CONVERTER
  // =========================================================

  async converter(id: number) {

    const orcamentoRepository =
      AppDataSource.getRepository(Orcamento);

    const orcamento =
      await orcamentoRepository.findOneBy({
        id_orcamento: id,
      });

    if (!orcamento) {
      throw new Error(
        'Orçamento não encontrado'
      );
    }

    if (
      orcamento.status === 'RECUSADO'
    ) {
      throw new Error(
        'Não é possível converter um orçamento recusado'
      );
    }

    if (
      orcamento.status === 'CONVERTIDO' ||
      orcamento.convertido
    ) {
      throw new Error(
        'Orçamento já convertido'
      );
    }

    if (
      orcamento.status === 'EM_CADASTRO'
    ) {
      return {
        message:
          'Orçamento já está em cadastro',

        orcamento,
      };
    }

    orcamento.status =
      'EM_CADASTRO';

    orcamento.convertido =
      false;

    orcamento.data_conversao =
      null as any;

    await orcamentoRepository.save(
      orcamento
    );

    return {
      message:
        'Conversão iniciada com sucesso',

      orcamento,
    };
  }

  // =========================================================
  // FINALIZAR CONVERSÃO
  // =========================================================

  async finalizarConversao(id: number) {

    const orcamentoRepository =
      AppDataSource.getRepository(Orcamento);

    const orcamento =
      await orcamentoRepository.findOneBy({
        id_orcamento: id,
      });

    if (!orcamento) {
      throw new Error(
        'Orçamento não encontrado'
      );
    }

    if (
      orcamento.status === 'RECUSADO'
    ) {
      throw new Error(
        'Não é possível finalizar um orçamento recusado'
      );
    }

    if (
      orcamento.status === 'CONVERTIDO' ||
      orcamento.convertido
    ) {
      return {
        message:
          'Orçamento já estava convertido',

        orcamento,
      };
    }

    orcamento.status =
      'CONVERTIDO';

    orcamento.convertido =
      true;

    orcamento.data_conversao =
      new Date();

    await orcamentoRepository.save(
      orcamento
    );

    return {
      message:
        'Orçamento convertido com sucesso',

      orcamento,
    };
  }

  // =========================================================
  // RECUSAR
  // =========================================================

  async recusar(id: number) {

    const orcamentoRepository =
      AppDataSource.getRepository(Orcamento);

    const orcamento =
      await orcamentoRepository.findOneBy({
        id_orcamento: id,
      });

    if (!orcamento) {
      throw new Error(
        'Orçamento não encontrado'
      );
    }

    if (
      orcamento.status === 'CONVERTIDO' ||
      orcamento.convertido
    ) {
      throw new Error(
        'Não é possível recusar um orçamento já convertido'
      );
    }

    orcamento.status =
      'RECUSADO';

    orcamento.convertido =
      false;

    await orcamentoRepository.save(
      orcamento
    );

    return {
      message:
        'Orçamento recusado com sucesso',

      orcamento,
    };
  }
}