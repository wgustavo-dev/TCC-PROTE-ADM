// Back_end/src/services/service_mensalidade.ts

import { AppDataSource } from "../config/database";
import { Mensalidade } from "../models/model_mensalidade";
import { Aluno } from "../models/model_aluno";
import { Condutor } from "../models/model_condutor";

// "YYYY-MM" a partir de uma data "YYYY-MM-DD"
function mesReferenciaDe(dataISO: string): string {
  return dataISO.slice(0, 7);
}

// Último dia válido de um mês (ex.: dia_vencimento=31 em fevereiro -> 28/29)
function ultimoDiaDoMes(ano: number, mesIndexado1: number): number {
  return new Date(ano, mesIndexado1, 0).getDate();
}

// Monta "YYYY-MM-DD" para o mês/ano informados, usando o dia desejado
// (limitado ao último dia real daquele mês).
function montarDataParaMes(ano: number, mesIndexado1: number, diaDesejado: number): string {
  const dia = Math.min(Math.max(1, diaDesejado), ultimoDiaDoMes(ano, mesIndexado1));
  const mesTexto = String(mesIndexado1).padStart(2, "0");
  const diaTexto = String(dia).padStart(2, "0");
  return `${ano}-${mesTexto}-${diaTexto}`;
}

export class ServiceMensalidade {
  private get mensalidadeRepository() {
    return AppDataSource.getRepository(Mensalidade);
  }

  private get alunoRepository() {
    return AppDataSource.getRepository(Aluno);
  }

  private get condutorRepository() {
    return AppDataSource.getRepository(Condutor);
  }

  private async validarAluno(id_aluno: any) {
    const idAluno = Number(id_aluno);

    if (!Number.isInteger(idAluno) || idAluno <= 0) {
      throw new Error("Aluno é obrigatório para cadastrar mensalidade");
    }

    const aluno = await this.alunoRepository.findOne({
      where: { id_aluno: idAluno },
      relations: {
        responsavel: true,
      },
    });

    if (!aluno) {
      throw new Error("Aluno não encontrado");
    }

    return aluno;
  }

  private async validarCondutor(id_condutor: any) {
    if (id_condutor === undefined || id_condutor === null || id_condutor === "") {
      return null;
    }

    const idCondutor = Number(id_condutor);

    if (!Number.isInteger(idCondutor) || idCondutor <= 0) {
      throw new Error("Condutor inválido");
    }

    const condutor = await this.condutorRepository.findOneBy({
      id_condutor: idCondutor,
    });

    if (!condutor) {
      throw new Error("Condutor não encontrado");
    }

    return condutor;
  }

  private validarValor(valor: any) {
    const texto = String(valor ?? "").trim();
    if (!texto) {
      throw new Error("Valor da mensalidade deve ser maior que zero");
    }

    const valorNumerico = Number(
      texto
        .replace(/[R$\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
    );

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      throw new Error("Valor da mensalidade deve ser maior que zero");
    }

    return Number(valorNumerico.toFixed(2));
  }

  private validarDataVencimento(data_vencimento: any) {
    if (!data_vencimento) {
      throw new Error("Data de vencimento é obrigatória");
    }

    const valor = String(data_vencimento).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      throw new Error("Data de vencimento inválida");
    }

    const data = new Date(`${valor}T12:00:00`);
    const [ano, mes, dia] = valor.split("-").map(Number);

    if (
      Number.isNaN(data.getTime()) ||
      data.getFullYear() !== ano ||
      data.getMonth() + 1 !== mes ||
      data.getDate() !== dia
    ) {
      throw new Error("Data de vencimento inválida");
    }

    return valor;
  }

  private validarStatus(status: any) {
    if (!status) {
      return "PENDENTE";
    }

    const statusPermitidos = ["PAGO", "PENDENTE", "ATRASADO"];
    const statusNormalizado = String(status).trim().toUpperCase();

    if (!statusPermitidos.includes(statusNormalizado)) {
      throw new Error("Status da mensalidade inválido");
    }

    return statusNormalizado as "PAGO" | "PENDENTE" | "ATRASADO";
  }

  async listar() {
    return await this.mensalidadeRepository.find({
      relations: {
        aluno: {
          responsavel: true,
        },
        condutor: true,
      },
      order: {
        data_vencimento: "ASC",
      },
    });
  }

  async buscarPorId(id: number) {
    const mensalidade = await this.mensalidadeRepository.findOne({
      where: { id_mensalidade: id },
      relations: {
        aluno: {
          responsavel: true,
        },
        condutor: true,
      },
    });

    if (!mensalidade) {
      throw new Error("Mensalidade não encontrada");
    }

    return mensalidade;
  }

  async criar(dados: Partial<Mensalidade>) {
    const aluno = await this.validarAluno(dados.id_aluno);
    const condutor = await this.validarCondutor(dados.id_condutor);

    const valor = this.validarValor(dados.valor);
    const dataVencimento = this.validarDataVencimento(dados.data_vencimento);

    /*
      REMOVIDO (pedido do usuário): o formulário de mensalidade não pede
      mais status nem data de pagamento na criação — toda mensalidade
      nova é sempre PENDENTE por padrão, sem exceção, mesmo que algo
      ainda mande esses campos no corpo da requisição. Marcar como paga
      é feito depois, por PUT /mensalidades/:id/pagar.
    */
    const mensalidade = this.mensalidadeRepository.create({
      id_aluno: aluno.id_aluno,
      valor,
      data_vencimento: dataVencimento,
      data_pagamento: null,
      status: "PENDENTE",
      id_condutor: condutor ? condutor.id_condutor : null,
      mes_referencia: mesReferenciaDe(dataVencimento),
    });

    await this.mensalidadeRepository.save(mensalidade);

    // Guarda o dia de vencimento escolhido no próprio aluno, para a
    // rotina de renovação mensal saber que dia usar nos meses seguintes.
    await this.atualizarDiaVencimentoDoAluno(aluno.id_aluno, dataVencimento);

    return await this.buscarPorId(mensalidade.id_mensalidade);
  }

  private async atualizarDiaVencimentoDoAluno(id_aluno: number, dataVencimentoISO: string) {
    const dia = Number(dataVencimentoISO.slice(8, 10));
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) return;

    await this.alunoRepository.update({ id_aluno }, { dia_vencimento: dia });
  }

  async atualizar(id: number, dados: Partial<Mensalidade>) {
    const mensalidade = await this.mensalidadeRepository.findOne({
      where: { id_mensalidade: id },
    });

    if (!mensalidade) {
      throw new Error("Mensalidade não encontrada");
    }

    if (dados.id_aluno !== undefined) {
      const aluno = await this.validarAluno(dados.id_aluno);
      mensalidade.id_aluno = aluno.id_aluno;
    }

    if (dados.id_condutor !== undefined) {
      const condutor = await this.validarCondutor(dados.id_condutor);
      mensalidade.id_condutor = condutor ? condutor.id_condutor : null;
    }

    if (dados.valor !== undefined) {
      mensalidade.valor = this.validarValor(dados.valor);
    }

    if (dados.data_vencimento !== undefined) {
      const dataVencimento = this.validarDataVencimento(dados.data_vencimento);
      mensalidade.data_vencimento = dataVencimento as any;
      mensalidade.mes_referencia = mesReferenciaDe(dataVencimento);
      await this.atualizarDiaVencimentoDoAluno(mensalidade.id_aluno, dataVencimento);
    }

    if (dados.status !== undefined) {
      mensalidade.status = this.validarStatus(dados.status);

      if (mensalidade.status !== "PAGO") {
        mensalidade.data_pagamento = null;
      }

      if (mensalidade.status === "PAGO" && !mensalidade.data_pagamento) {
        mensalidade.data_pagamento = dados.data_pagamento
          ? new Date(dados.data_pagamento)
          : new Date();
      }
    }

    if (dados.data_pagamento !== undefined) {
      mensalidade.data_pagamento = dados.data_pagamento
        ? new Date(dados.data_pagamento)
        : null;
    }

    await this.mensalidadeRepository.save(mensalidade);

    return await this.buscarPorId(mensalidade.id_mensalidade);
  }

  async deletar(id: number) {
    const mensalidade = await this.mensalidadeRepository.findOne({
      where: { id_mensalidade: id },
    });

    if (!mensalidade) {
      throw new Error("Mensalidade não encontrada");
    }

    // A mensalidade compõe o histórico financeiro do aluno. Ela só é
    // removida na exclusão transacional do aluno ou do responsável.
    throw new Error(
      "Não é permitido excluir uma mensalidade isoladamente. Exclua o aluno ou o responsável para remover todos os registros vinculados."
    );
  }

  async marcarComoPago(id: number) {
    const mensalidade = await this.mensalidadeRepository.findOne({
      where: { id_mensalidade: id },
    });

    if (!mensalidade) {
      throw new Error("Mensalidade não encontrada");
    }

    if (mensalidade.status === "PAGO" || mensalidade.data_pagamento) {
      throw new Error("Mensalidade já foi paga");
    }

    mensalidade.status = "PAGO";
    mensalidade.data_pagamento = new Date();

    await this.mensalidadeRepository.save(mensalidade);

    return await this.buscarPorId(mensalidade.id_mensalidade);
  }

  /*
    ROTINA DE VIRADA DE MÊS (schema_prote_v1.11):

    Regra do usuário:
    - Quando o mês vira, o sistema deve gerar automaticamente uma nova
      mensalidade PENDENTE para cada aluno que já tem histórico de
      mensalidade, usando o dia de vencimento ("todo dia X") do aluno.
    - Mensalidades antigas NUNCA são apagadas — o histórico é preservado.
    - A geração é idempotente: rodar essa função várias vezes no mesmo
      mês não duplica mensalidade nenhuma (usa mes_referencia para saber
      o que já foi gerado).

    Não depende de nenhum agendador externo (ex.: node-cron): é chamada
    no startup do servidor e depois em um intervalo periódico dentro do
    próprio server.ts, e também pode ser disparada manualmente pela rota
    PUT /api/mensalidades/renovar-mes.
  */
  async gerarRenovacaoMensal() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mesIndexado1 = hoje.getMonth() + 1;
    const mesReferenciaAtual = `${ano}-${String(mesIndexado1).padStart(2, "0")}`;

    // Para cada aluno, pega a mensalidade mais recente já cadastrada
    // (independente do mês) — é dela que tiramos o valor a repetir.
    const ultimasPorAluno: any[] = await AppDataSource.query(
      `SELECT m.id_aluno, m.valor, m.mes_referencia
       FROM mensalidade m
       INNER JOIN (
         SELECT id_aluno, MAX(data_vencimento) AS max_data
         FROM mensalidade
         GROUP BY id_aluno
       ) ultima
         ON ultima.id_aluno = m.id_aluno AND ultima.max_data = m.data_vencimento`
    );

    let geradas = 0;

    for (const registro of ultimasPorAluno) {
      if (registro.mes_referencia === mesReferenciaAtual) {
        // Já existe mensalidade deste aluno no mês atual — não duplica.
        continue;
      }

      const aluno = await this.alunoRepository.findOneBy({ id_aluno: registro.id_aluno });
      if (!aluno) continue;

      const diaVencimento = aluno.dia_vencimento || 10;
      const novaDataVencimento = montarDataParaMes(ano, mesIndexado1, diaVencimento);

      // Checagem extra de segurança contra corrida/duplicidade, além do
      // filtro acima (que já usa a mensalidade mais recente).
      const existente = await this.mensalidadeRepository.findOne({
        where: { id_aluno: aluno.id_aluno, mes_referencia: mesReferenciaAtual },
      });
      if (existente) continue;

      const novaMensalidade = this.mensalidadeRepository.create({
        id_aluno: aluno.id_aluno,
        valor: registro.valor,
        data_vencimento: novaDataVencimento as any,
        data_pagamento: null,
        status: "PENDENTE",
        id_condutor: aluno.id_condutor || null,
        mes_referencia: mesReferenciaAtual,
      });

      await this.mensalidadeRepository.save(novaMensalidade);
      geradas++;
    }

    return {
      message: `Renovação mensal executada. ${geradas} mensalidade(s) gerada(s) para ${mesReferenciaAtual}.`,
      geradas,
      mes_referencia: mesReferenciaAtual,
    };
  }

  async atualizarMensalidadesAtrasadas() {
    await this.mensalidadeRepository
      .createQueryBuilder()
      .update(Mensalidade)
      .set({ status: "ATRASADO" })
      .where("data_vencimento < CURDATE()")
      .andWhere("status = :status", { status: "PENDENTE" })
      .execute();

    return {
      message: "Mensalidades atrasadas atualizadas",
    };
  }
}
