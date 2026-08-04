import { AppDataSource } from "../config/database";
import { Aluno } from "../models/model_aluno";
import { Presenca } from "../models/model_presenca";
import { Mensalidade } from "../models/model_mensalidade";
import { Despesa } from "../models/model_despesa";
import { Documento } from "../models/model_documento";
import { Monitor } from "../models/model_monitor";
import { Orcamento } from "../models/model_orcamento";
import { ServiceMensalidade } from "./service_mensalidade";
import { calcularDiasRestantes } from "./service_documento";

/*
  O TypeORM, para colunas type: "date", normalmente devolve uma string
  no formato "YYYY-MM-DD" (não um objeto Date). Essa função trata os
  dois casos com segurança, sem chamar .toISOString() em algo que
  pode não ser um Date de fato.
*/
function formatarDataISO(valor: unknown): string {
  if (!valor) return "";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).slice(0, 10);
}

export class ServiceDashboard {
  async resumo() {
    const serviceMensalidade = new ServiceMensalidade();
    await serviceMensalidade.atualizarMensalidadesAtrasadas();

    const repoAluno = AppDataSource.getRepository(Aluno);
    const repoPresenca = AppDataSource.getRepository(Presenca);
    const repoMensalidade = AppDataSource.getRepository(Mensalidade);
    const repoDespesa = AppDataSource.getRepository(Despesa);
    const repoDocumento = AppDataSource.getRepository(Documento);
    const repoMonitor = AppDataSource.getRepository(Monitor);
    const repoOrcamento = AppDataSource.getRepository(Orcamento);

    const hoje = new Date();
    let anoAtual = hoje.getFullYear();
    let mesAtual = hoje.getMonth() + 1;

    const alunosAtivos = await repoAluno.count();
    const monitoresAtivos = await repoMonitor.count({ where: { ativo: true } });

    const currentYearDespesaCount = await repoDespesa
      .createQueryBuilder("despesa")
      .select("COUNT(*)", "count")
      .where("YEAR(despesa.data) = :ano", { ano: anoAtual })
      .getRawOne();

    const currentYearMensalidadeCount = await repoMensalidade
      .createQueryBuilder("mensalidade")
      .select("COUNT(*)", "count")
      .where("YEAR(mensalidade.data_vencimento) = :ano", { ano: anoAtual })
      .getRawOne();

    const hasCurrentYearData =
      Number(currentYearDespesaCount.count) > 0 ||
      Number(currentYearMensalidadeCount.count) > 0;

    if (!hasCurrentYearData) {
      const latestDespesa = await repoDespesa
        .createQueryBuilder("despesa")
        .select("MAX(despesa.data)", "ultima")
        .getRawOne();

      const latestMensalidade = await repoMensalidade
        .createQueryBuilder("mensalidade")
        .select("MAX(mensalidade.data_vencimento)", "ultima")
        .getRawOne();

      const ultimaDespesaData = latestDespesa?.ultima ? new Date(latestDespesa.ultima) : null;
      const ultimaMensalidadeData = latestMensalidade?.ultima ? new Date(latestMensalidade.ultima) : null;
      const ultimaData = [ultimaDespesaData, ultimaMensalidadeData].filter(Boolean).sort((a, b) => Number(b) - Number(a))[0];

      if (ultimaData) {
        anoAtual = ultimaData.getFullYear();
        mesAtual = ultimaData.getMonth() + 1;
      }
    }

    const receitaMensalResult = await repoMensalidade
      .createQueryBuilder("mensalidade")
      .select("SUM(mensalidade.valor)", "total")
      .where("MONTH(mensalidade.data_vencimento) = :mes", { mes: mesAtual })
      .andWhere("YEAR(mensalidade.data_vencimento) = :ano", { ano: anoAtual })
      .andWhere("mensalidade.status = :status", { status: "PAGO" })
      .getRawOne();

    const despesasMensaisResult = await repoDespesa
      .createQueryBuilder("despesa")
      .select("SUM(despesa.valor)", "total")
      .where("MONTH(despesa.data) = :mes", { mes: mesAtual })
      .andWhere("YEAR(despesa.data) = :ano", { ano: anoAtual })
      .getRawOne();

    const totalPresencasMes = await repoPresenca
      .createQueryBuilder("presenca")
      .where("MONTH(presenca.data) = :mes", { mes: mesAtual })
      .andWhere("YEAR(presenca.data) = :ano", { ano: anoAtual })
      .getCount();

    const presencasPresentesMes = await repoPresenca
      .createQueryBuilder("presenca")
      .where("MONTH(presenca.data) = :mes", { mes: mesAtual })
      .andWhere("YEAR(presenca.data) = :ano", { ano: anoAtual })
      .andWhere("presenca.status = :status", { status: "PRESENTE" })
      .getCount();

    const receitaMensal = Number(receitaMensalResult.total) || 0;
    const despesasMensais = Number(despesasMensaisResult.total) || 0;
    const lucroMensal = receitaMensal - despesasMensais;

    const presencaMedia =
      totalPresencasMes > 0 ? (presencasPresentesMes / totalPresencasMes) * 100 : 0;

    const documentos = await repoDocumento.find();
    const documentosVencidos = documentos.filter((documento) => {
      const diasRestantes = calcularDiasRestantes(documento.data_validade);
      return diasRestantes !== null && diasRestantes < 0;
    }).length;
    const documentosVencemEmBreve = documentos.filter((documento) => {
      const diasRestantes = calcularDiasRestantes(documento.data_validade);
      return diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7;
    }).length;

    const orcamentoStatusCounts = await repoOrcamento
      .createQueryBuilder("orcamento")
      .select("orcamento.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("orcamento.status")
      .getRawMany();

    const orcamentoMap = orcamentoStatusCounts.reduce(
      (acc, item) => ({
        ...acc,
        [item.status]: Number(item.count) || 0,
      }),
      {
        PENDENTE: 0,
        CONVERTIDO: 0,
        RECUSADO: 0,
        EM_CADASTRO: 0,
      }
    );

    const escolas = await repoAluno
      .createQueryBuilder("aluno")
      .leftJoin("aluno.escola", "escola")
      .select("escola.nome", "nome")
      .addSelect("COUNT(aluno.id_aluno)", "total")
      .groupBy("escola.id_escola")
      .orderBy("total", "DESC")
      .getRawMany();

    const escolasComContagem = escolas.map((item) => ({
      nome: item.nome || "Sem escola",
      total: Number(item.total) || 0,
    }));

    const proximosPagamentos = await repoMensalidade
      .createQueryBuilder("mensalidade")
      .leftJoinAndSelect("mensalidade.aluno", "aluno")
      .where("mensalidade.status = :status", { status: "PENDENTE" })
      .andWhere("DATE(mensalidade.data_vencimento) >= CURDATE()")
      .andWhere("DATE(mensalidade.data_vencimento) <= DATE_ADD(CURDATE(), INTERVAL 5 DAY)")
      .orderBy("mensalidade.data_vencimento", "ASC")
      .addOrderBy("aluno.nome", "ASC")
      .limit(5)
      .getMany();

    const ultimosPagamentos = await repoMensalidade
      .createQueryBuilder("mensalidade")
      .leftJoinAndSelect("mensalidade.aluno", "aluno")
      .where("mensalidade.status = :status", { status: "PAGO" })
      .andWhere("mensalidade.data_pagamento IS NOT NULL")
      .andWhere("DATE(mensalidade.data_pagamento) >= DATE_SUB(CURDATE(), INTERVAL 5 DAY)")
      .orderBy("mensalidade.data_pagamento", "DESC")
      .limit(5)
      .getMany();

    const meses = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    const graficoMensal = [];

    for (let i = 1; i <= 12; i++) {
      const receitaResult = await repoMensalidade
        .createQueryBuilder("mensalidade")
        .select("SUM(mensalidade.valor)", "total")
        .where("MONTH(mensalidade.data_vencimento) = :mes", { mes: i })
        .andWhere("YEAR(mensalidade.data_vencimento) = :ano", { ano: anoAtual })
        .andWhere("mensalidade.status = :status", { status: "PAGO" })
        .getRawOne();

      const despesaResult = await repoDespesa
        .createQueryBuilder("despesa")
        .select("SUM(despesa.valor)", "total")
        .where("MONTH(despesa.data) = :mes", { mes: i })
        .andWhere("YEAR(despesa.data) = :ano", { ano: anoAtual })
        .getRawOne();

      graficoMensal.push({
        mes: meses[i - 1],
        receita: Number(receitaResult.total) || 0,
        despesa: Number(despesaResult.total) || 0,
      });
    }

    return {
      receita_mensal: receitaMensal,
      despesas_mensais: despesasMensais,
      lucro_mensal: lucroMensal,
      alunos_ativos: alunosAtivos,
      presenca_media: Number(presencaMedia.toFixed(1)),
      monitores_ativos: monitoresAtivos,
      grafico_mensal: graficoMensal,
      documentos: {
        vencidos: documentosVencidos,
        vencem_em_ate_7_dias: documentosVencemEmBreve,
      },
      orcamentos: {
        pendentes: orcamentoMap.PENDENTE,
        aprovados: orcamentoMap.CONVERTIDO,
        negados: orcamentoMap.RECUSADO,
      },
      escolas: escolasComContagem,
      proximos_pagamentos: proximosPagamentos.map((item) => ({
        nome_aluno: item.aluno?.nome || `Aluno #${item.id_aluno}`,
        data_vencimento: formatarDataISO(item.data_vencimento),
        valor: Number(item.valor) || 0,
      })),
      ultimos_pagamentos: ultimosPagamentos.map((item) => ({
        nome_aluno: item.aluno?.nome || `Aluno #${item.id_aluno}`,
        data_pagamento: formatarDataISO(item.data_pagamento),
        valor: Number(item.valor) || 0,
      })),
      resumo_financeiro: {
        receita_total: receitaMensal,
        despesas_total: despesasMensais,
        saldo_mensal: lucroMensal,
      },
    };
  }
}