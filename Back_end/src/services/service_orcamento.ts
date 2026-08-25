import { AppDataSource } from '../config/database';
import { Orcamento } from '../models/model_orcamento';

export class ServiceOrcamento {

  // =========================================================
  // NORMALIZAÇÕES
  // =========================================================

  private normalizarNomeResponsavel(nome: any): string {
    const valor = String(nome ?? "").trim();

    if (!valor || valor.length < 2 || valor.length > 100) {
      throw new Error(
        "Nome do responsável deve ter entre 2 e 100 caracteres."
      );
    }

    return valor.replace(/\s+/g, " ");
  }

  private normalizarTelefone(telefone: any): string {
    const valor = String(telefone ?? "").replace(/\D/g, "");

    if (!/^\d{10,11}$/.test(valor)) {
      throw new Error(
        "Telefone inválido. Use DDD + 8 ou 9 dígitos."
      );
    }

    return valor;
  }

  private normalizarTextoCurto(
    texto: any,
    campo: string,
    max: number
  ): string {
    const valor = String(texto ?? "").trim();

    if (!valor || valor.length > max) {
      throw new Error(
        `${campo} é obrigatório e deve ter até ${max} caracteres.`
      );
    }

    return valor.replace(/\s+/g, " ");
  }

  private normalizarEndereco(
    endereco: any,
    campo: string
  ): string {
    const valor = String(endereco ?? "").trim();

    if (!valor || valor.length < 5 || valor.length > 255) {
      throw new Error(
        `${campo} é obrigatório e deve ter entre 5 e 255 caracteres.`
      );
    }

    return valor.replace(/\s+/g, " ");
  }

  private normalizarValor(valor: any): number | null {
    if (
      valor === undefined ||
      valor === null ||
      valor === ""
    ) {
      return null;
    }

    const numero = Number(valor);

    if (
      !Number.isFinite(numero) ||
      numero < 0 ||
      numero > 9999999.99
    ) {
      throw new Error("Valor do orçamento inválido.");
    }

    return Number(numero.toFixed(2));
  }

  private normalizarTurno(
    turno: any
  ): "MANHA" | "TARDE" | null {
    const valor = String(turno ?? "")
      .trim()
      .toUpperCase();

    if (!valor) return null;

    if (valor === "MANHA" || valor === "TARDE") {
      return valor;
    }

    throw new Error(
      "Turno inválido. Use MANHA ou TARDE."
    );
  }

  private normalizarTipoTrajeto(
    tipo: any
  ): "IDA" | "VOLTA" | "AMBOS" | null {
    const valor = String(tipo ?? "")
      .trim()
      .toUpperCase();

    if (!valor) return null;

    if (
      valor === "IDA" ||
      valor === "VOLTA" ||
      valor === "AMBOS"
    ) {
      return valor;
    }

    throw new Error(
      "Tipo de trajeto inválido. Use IDA, VOLTA ou AMBOS."
    );
  }

  // =========================================================
  // REGRA DOS ENDEREÇOS
  // =========================================================
  //
  // IDA:
  //   - embarque obrigatório
  //   - desembarque NÃO existe
  //
  // VOLTA:
  //   - desembarque obrigatório
  //   - embarque NÃO existe
  //
  // AMBOS:
  //   - embarque obrigatório
  //   - desembarque obrigatório
  //
  // =========================================================

  private aplicarRegraEnderecoPorTrajeto(
    tipoTrajeto: "IDA" | "VOLTA" | "AMBOS" | null,
    embarque: any,
    desembarque: any
  ) {

    const embarqueInformado =
      embarque !== undefined &&
      embarque !== null &&
      String(embarque).trim() !== "";

    const desembarqueInformado =
      desembarque !== undefined &&
      desembarque !== null &&
      String(desembarque).trim() !== "";

    // ---------------------------------------------------------
    // IDA
    // ---------------------------------------------------------

    if (tipoTrajeto === "IDA") {

      if (!embarqueInformado) {
        throw new Error(
          "Endereço de embarque é obrigatório para o trajeto de ida."
        );
      }

      return {
        embarque: this.normalizarEndereco(
          embarque,
          "Endereço de embarque"
        ),
        desembarque: null,
      };
    }

    // ---------------------------------------------------------
    // VOLTA
    // ---------------------------------------------------------

    if (tipoTrajeto === "VOLTA") {

      if (!desembarqueInformado) {
        throw new Error(
          "Endereço de desembarque é obrigatório para o trajeto de volta."
        );
      }

      return {
        embarque: null,
        desembarque: this.normalizarEndereco(
          desembarque,
          "Endereço de desembarque"
        ),
      };
    }

    // ---------------------------------------------------------
    // AMBOS
    // ---------------------------------------------------------

    if (tipoTrajeto === "AMBOS") {

      if (!embarqueInformado) {
        throw new Error(
          "Endereço de embarque é obrigatório para o trajeto de ida."
        );
      }

      if (!desembarqueInformado) {
        throw new Error(
          "Endereço de desembarque é obrigatório para o trajeto de volta."
        );
      }

      return {
        embarque: this.normalizarEndereco(
          embarque,
          "Endereço de embarque"
        ),
        desembarque: this.normalizarEndereco(
          desembarque,
          "Endereço de desembarque"
        ),
      };
    }

    // ---------------------------------------------------------
    // Nenhum trajeto válido
    // ---------------------------------------------------------

    return {
      embarque: null,
      desembarque: null,
    };
  }

  // =========================================================
  // LISTAR
  // =========================================================

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

    // -------------------------------------------------------
    // Dados básicos
    // -------------------------------------------------------

    const nomeResponsavel =
      this.normalizarNomeResponsavel(
        dados.nome_responsavel
      );

    const telefone =
      this.normalizarTelefone(
        dados.telefone
      );

    const quantidade =
      Number(dados.quantidade_alunos);

    if (
      !Number.isInteger(quantidade) ||
      quantidade < 1
    ) {
      throw new Error(
        'Quantidade de alunos deve ser pelo menos 1'
      );
    }

    // -------------------------------------------------------
    // Dados opcionais
    // -------------------------------------------------------

    const bairro =
      dados.bairro !== undefined &&
      dados.bairro !== null &&
      String(dados.bairro).trim() !== ""
        ? this.normalizarTextoCurto(
            dados.bairro,
            'Bairro',
            100
          )
        : null;

    const escola =
      dados.escola !== undefined &&
      dados.escola !== null &&
      String(dados.escola).trim() !== ""
        ? this.normalizarTextoCurto(
            dados.escola,
            'Escola',
            150
          )
        : null;

    const turno =
      this.normalizarTurno(
        dados.turno
      );

    const tipoTrajeto =
      this.normalizarTipoTrajeto(
        dados.tipo_trajeto
      );

    // -------------------------------------------------------
    // ENDEREÇOS
    // -------------------------------------------------------
    //
    // Aqui está a principal correção.
    // O backend agora decide quais endereços existem
    // de acordo com o tipo de trajeto.
    // -------------------------------------------------------

    const enderecos =
      this.aplicarRegraEnderecoPorTrajeto(
        tipoTrajeto,
        dados.endereco_embarque,
        dados.endereco_desembarque
      );

    // -------------------------------------------------------
    // Valor
    // -------------------------------------------------------

    const valor =
      this.normalizarValor(
        dados.valor
      );

    // -------------------------------------------------------
    // Criação
    // -------------------------------------------------------

    const orcamento =
      orcamentoRepository.create({

        nome_responsavel:
          nomeResponsavel,

        telefone,

        bairro,

        escola,

        turno,

        quantidade_alunos:
          quantidade,

        tipo_trajeto:
          tipoTrajeto,

        endereco_embarque:
          enderecos.embarque,

        endereco_desembarque:
          enderecos.desembarque,

        valor,

        status:
          'PENDENTE',

        convertido:
          false,

        data_solicitacao:
          dados.data_solicitacao ||
          new Date(),

        data_conversao:
          null as any,

        id_condutor:
          dados.id_condutor,
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
      throw new Error(
        'Orçamento não encontrado'
      );
    }

    // -------------------------------------------------------
    // Nome
    // -------------------------------------------------------

    if (
      dados.nome_responsavel !== undefined
    ) {
      orcamento.nome_responsavel =
        this.normalizarNomeResponsavel(
          dados.nome_responsavel
        );
    }

    // -------------------------------------------------------
    // Telefone
    // -------------------------------------------------------

    if (
      dados.telefone !== undefined
    ) {
      orcamento.telefone =
        this.normalizarTelefone(
          dados.telefone
        );
    }

    // -------------------------------------------------------
    // Bairro
    // -------------------------------------------------------

    if (
      dados.bairro !== undefined
    ) {

      if (
        dados.bairro === null ||
        String(dados.bairro).trim() === ""
      ) {
        orcamento.bairro = null;
      } else {
        orcamento.bairro =
          this.normalizarTextoCurto(
            dados.bairro,
            'Bairro',
            100
          );
      }
    }

    // -------------------------------------------------------
    // Escola
    // -------------------------------------------------------

    if (
      dados.escola !== undefined
    ) {

      if (
        dados.escola === null ||
        String(dados.escola).trim() === ""
      ) {
        orcamento.escola = null;
      } else {
        orcamento.escola =
          this.normalizarTextoCurto(
            dados.escola,
            'Escola',
            150
          );
      }
    }

    // -------------------------------------------------------
    // Turno
    // -------------------------------------------------------

    if (
      dados.turno !== undefined
    ) {
      orcamento.turno =
        this.normalizarTurno(
          dados.turno
        );
    }

    // -------------------------------------------------------
    // Quantidade de alunos
    // -------------------------------------------------------

    if (
      dados.quantidade_alunos !== undefined
    ) {

      const quantidade =
        Number(
          dados.quantidade_alunos
        );

      if (
        !Number.isInteger(quantidade) ||
        quantidade < 1
      ) {
        throw new Error(
          'Quantidade de alunos deve ser pelo menos 1'
        );
      }

      orcamento.quantidade_alunos =
        quantidade;
    }

    // -------------------------------------------------------
    // Tipo de trajeto
    // -------------------------------------------------------

    if (
      dados.tipo_trajeto !== undefined
    ) {
      orcamento.tipo_trajeto =
        this.normalizarTipoTrajeto(
          dados.tipo_trajeto
        );
    }

    // =======================================================
    // ENDEREÇOS
    // =======================================================
    //
    // IMPORTANTE:
    // Não validamos embarque/desembarque separadamente.
    //
    // Primeiro pegamos os valores atuais + os novos valores.
    // Depois aplicamos a regra do trajeto.
    // =======================================================

    const novoEmbarque =
      dados.endereco_embarque !== undefined
        ? dados.endereco_embarque
        : orcamento.endereco_embarque;

    const novoDesembarque =
      dados.endereco_desembarque !== undefined
        ? dados.endereco_desembarque
        : orcamento.endereco_desembarque;

    const enderecos =
      this.aplicarRegraEnderecoPorTrajeto(
        orcamento.tipo_trajeto,
        novoEmbarque,
        novoDesembarque
      );

    orcamento.endereco_embarque =
      enderecos.embarque;

    orcamento.endereco_desembarque =
      enderecos.desembarque;

    // -------------------------------------------------------
    // Valor
    // -------------------------------------------------------

    if (
      dados.valor !== undefined
    ) {
      orcamento.valor =
        this.normalizarValor(
          dados.valor
        );
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