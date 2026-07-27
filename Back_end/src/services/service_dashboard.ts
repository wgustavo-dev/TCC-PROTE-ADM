import { AppDataSource } from "../config/database";
import { Aluno } from "../models/model_aluno";
import { Presenca } from "../models/model_presenca";
import { Mensalidade } from "../models/model_mensalidade";
import { Despesa } from "../models/model_despesa";
import { ServiceMensalidade } from "./service_mensalidade"
import { Documento } from "../models/model_documento";
import { calcularDiasRestantes } from "./service_documento";

export class ServiceDashboard {
  async resumo() {
    const serviceMensalidade = new ServiceMensalidade();
    await serviceMensalidade.atualizarMensalidadesAtrasadas();
    
    const repoAluno = AppDataSource.getRepository(Aluno);
    const repoPresenca = AppDataSource.getRepository(Presenca);
    const repoMensalidade = AppDataSource.getRepository(Mensalidade);
    const repoDespesa = AppDataSource.getRepository(Despesa);
    const repoDocumento = AppDataSource.getRepository(Documento);
    


    const hoje = new Date();
    let anoAtual = hoje.getFullYear();
    let mesAtual = hoje.getMonth() + 1;

    const alunosAtivos = await repoAluno.count();

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

    const totalPresencas = await repoPresenca.count();

    const presencasPresentes = await repoPresenca.count({
      where: {
        status: "PRESENTE",
      },
    });

    const receitaMensal = Number(receitaMensalResult.total) || 0;
    const despesasMensais = Number(despesasMensaisResult.total) || 0;
    const lucroMensal = receitaMensal - despesasMensais;

    const presencaMedia =
      totalPresencas > 0 ? (presencasPresentes / totalPresencas) * 100 : 0;

    const documentos = await repoDocumento.find();
    const documentosVencidos = documentos.filter((documento) => {
      const diasRestantes = calcularDiasRestantes(documento.data_validade);
      return diasRestantes !== null && diasRestantes < 0;
    }).length;
    const documentosVencemEmBreve = documentos.filter((documento) => {
      const diasRestantes = calcularDiasRestantes(documento.data_validade);
      return diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7;
    }).length;

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

    const alertas = [];

    const mensalidadesAlerta = await repoMensalidade
      .createQueryBuilder("mensalidade")
      .leftJoinAndSelect("mensalidade.aluno", "aluno")
      .where("mensalidade.status = :atrasado", { atrasado: "ATRASADO" })
      .orWhere(
        "mensalidade.status = :pendente AND mensalidade.data_vencimento = CURDATE()",
        { pendente: "PENDENTE" }
      )
      .orderBy("mensalidade.data_vencimento", "ASC")
      .addOrderBy("aluno.nome", "ASC")
      .getMany();

    const hojeLocal = new Date();
    hojeLocal.setHours(0, 0, 0, 0);

    for (const mensalidade of mensalidadesAlerta) {
      const nomeAluno = mensalidade.aluno?.nome || `Aluno #${mensalidade.id_aluno}`;
      const dataVencimento = String(mensalidade.data_vencimento || "").slice(0, 10);
      const [ano, mes, dia] = dataVencimento.split("-").map(Number);
      const vencimentoLocal = new Date(ano, mes - 1, dia);
      vencimentoLocal.setHours(0, 0, 0, 0);
      const diasAtraso = Math.round((hojeLocal.getTime() - vencimentoLocal.getTime()) / (1000 * 60 * 60 * 24));
      const tipo = diasAtraso === 0 ? "vence_hoje" : "atrasada";

      alertas.push({
        nome_aluno: nomeAluno,
        data_vencimento: dataVencimento,
        tipo,
        dias_atraso: diasAtraso,
      });
    }

    return {
      receita_mensal: receitaMensal,
      despesas_mensais: despesasMensais,
      lucro_mensal: lucroMensal,
      alunos_ativos: alunosAtivos,
      presenca_media: Number(presencaMedia.toFixed(1)),
      grafico_mensal: graficoMensal,
      alertas,
      documentos: {
        vencidos: documentosVencidos,
        vencem_em_ate_7_dias: documentosVencemEmBreve,
      },
      resumo_financeiro: {
        receita_total: receitaMensal,
        despesas_total: despesasMensais,
        saldo_mensal: lucroMensal,
      },
    };
  }
}