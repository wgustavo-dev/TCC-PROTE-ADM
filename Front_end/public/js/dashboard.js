/* ==========================================================================
   FUNÇÕES UTILITÁRIAS E DE FORMATAÇÃO
   ========================================================================== */

function formatarBRL(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarDataBR(dataISO) {
  if (!dataISO) return "";
  const partes = String(dataISO).slice(0, 10).split("-");
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarNumero2Digitos(valor) {
  return String(Number(valor) || 0).padStart(2, "0");
}

/* ==========================================================================
   CARREGAMENTO
   ========================================================================== */

async function carregarDashboard() {
  try {
    return await window.API.get("/dashboard/resumo");
  } catch (error) {
    console.error("Erro ao carregar dados do painel:", error);
    showError("Não foi possível carregar o painel.");
    return null;
  }
}

/* ==========================================================================
   COMPONENTES DA INTERFACE
   ========================================================================== */

function initMenu() {
  const botaoMenu = document.getElementById("botaoMenu");
  const sidebar = document.getElementById("sidebar");
  const fundoEscuro = document.getElementById("fundoEscuro");

  if (!botaoMenu || !sidebar || !fundoEscuro) return;

  const alternarMenu = () => {
    sidebar.classList.toggle("aberta");
    fundoEscuro.classList.toggle("ativo");
    botaoMenu.classList.toggle("aberto");
  };

  const fecharMenu = () => {
    sidebar.classList.remove("aberta");
    fundoEscuro.classList.remove("ativo");
    botaoMenu.classList.remove("aberto");
  };

  botaoMenu.addEventListener("click", alternarMenu);
  fundoEscuro.addEventListener("click", fecharMenu);
}

function atualizarKpis(dados) {
  if (!dados) return;

  const elReceita = document.getElementById("kpiReceita");
  if (elReceita) elReceita.textContent = formatarBRL(dados.receita_mensal);

  const elDespesas = document.getElementById("kpiDespesas");
  if (elDespesas) elDespesas.textContent = formatarBRL(dados.despesas_mensais);

  const elLucro = document.getElementById("kpiLucro");
  if (elLucro) elLucro.textContent = formatarBRL(dados.lucro_mensal);

  const elAlunos = document.getElementById("kpiAlunos");
  if (elAlunos) elAlunos.textContent = String(dados.alunos_ativos || 0);

  const presencaMedia = Number(dados.presenca_media || 0);
  const elPresenca = document.getElementById("kpiPresenca");
  if (elPresenca) elPresenca.textContent = `${presencaMedia.toFixed(1)}%`;

  const barraPresenca = document.getElementById("barraPresenca");
  if (barraPresenca) barraPresenca.style.width = `${Math.min(100, presencaMedia)}%`;

  const elMonitores = document.getElementById("kpiMonitores");
  if (elMonitores) elMonitores.textContent = formatarNumero2Digitos(dados.monitores_ativos);

  const documentos = dados.documentos || {};
  const elDocsVencidos = document.getElementById("kpiDocsVencidos");
  if (elDocsVencidos) elDocsVencidos.textContent = String(documentos.vencidos || 0);

  const elDocsBreve = document.getElementById("kpiDocsVencemBreve");
  if (elDocsBreve) elDocsBreve.textContent = String(documentos.vencem_em_ate_7_dias || 0);

  const elOrcamentosPendentes = document.getElementById("kpiOrcamentosPendentes");
  if (elOrcamentosPendentes) elOrcamentosPendentes.textContent = String(dados.orcamentos?.pendentes || 0);

  const elOrcamentosAprovados = document.getElementById("kpiOrcamentosAprovados");
  if (elOrcamentosAprovados) elOrcamentosAprovados.textContent = String(dados.orcamentos?.aprovados || 0);

  const elOrcamentosNegados = document.getElementById("kpiOrcamentosNegados");
  if (elOrcamentosNegados) elOrcamentosNegados.textContent = String(dados.orcamentos?.negados || 0);
}

function renderizarEstadoErro() {
  ["kpiReceita", "kpiDespesas", "kpiLucro", "kpiAlunos", "kpiPresenca", "kpiMonitores"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });

  const barraPresenca = document.getElementById("barraPresenca");
  if (barraPresenca) barraPresenca.style.width = "0%";

  ["kpiDocsVencidos", "kpiDocsVencemBreve", "kpiOrcamentosPendentes", "kpiOrcamentosAprovados", "kpiOrcamentosNegados"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  });

  const listaEscolas = document.getElementById("listaEscolas");
  if (listaEscolas) {
    listaEscolas.innerHTML = '<li class="aviso-sem-dados">Não foi possível carregar os dados.</li>';
  }

  const listaProximos = document.getElementById("listaProximosPagamentos");
  if (listaProximos) {
    listaProximos.innerHTML = '<p class="aviso-sem-dados">Não foi possível carregar os dados.</p>';
  }

  const listaUltimos = document.getElementById("listaUltimosPagamentos");
  if (listaUltimos) {
    listaUltimos.innerHTML = '<p class="aviso-sem-dados">Não foi possível carregar os dados.</p>';
  }

  iniciarGrafico(null);
}

/* Card "Alunos por escola" */
function renderizarEscolas(escolas) {
  const lista = document.getElementById("listaEscolas");
  if (!lista) return;

  if (!Array.isArray(escolas) || escolas.length === 0) {
    lista.innerHTML = '<li class="aviso-sem-dados">Nenhuma escola cadastrada.</li>';
    return;
  }

  const topEscolas = escolas.slice(0, 4);
  lista.innerHTML = topEscolas
    .map((item) => `<li><span>${item.nome}</span> <strong>${item.total}</strong></li>`)
    .join("");
}

/* Linha 3: listas de próximos e últimos pagamentos */
function renderizarListaPagamentos(elementId, pagamentos, campoData, corValor, mensagemVazio) {
  const container = document.getElementById(elementId);
  if (!container) return;

  if (!Array.isArray(pagamentos) || !pagamentos.length) {
    container.innerHTML = `<p class="aviso-sem-dados">${mensagemVazio}</p>`;
    return;
  }

  container.innerHTML = pagamentos
    .map((item) => `
      <div class="item-pagamento">
        <span class="nome-pagamento">${item.nome_aluno} — mensalidade</span>
        <span class="data-pagamento">${formatarDataBR(item[campoData])}</span>
        <span class="valor-pagamento ${corValor}">${formatarBRL(item.valor)}</span>
      </div>
    `)
    .join("");
}

/* Linha 5: cards de Documentos e Orçamentos */
function atualizarDocumentosEOrcamentos(dados) {
  const documentos = dados.documentos || {};
  const elDocsVencemBreve = document.getElementById("kpiDocsVencemBreve");
  if (elDocsVencemBreve) elDocsVencemBreve.textContent = String(documentos.vencem_em_ate_7_dias || 0);

  const elDocsVencidos = document.getElementById("kpiDocsVencidos");
  if (elDocsVencidos) elDocsVencidos.textContent = String(documentos.vencidos || 0);

  const orcamentos = dados.orcamentos || {};
  const elOrcPendentes = document.getElementById("kpiOrcamentosPendentes");
  if (elOrcPendentes) elOrcPendentes.textContent = String(orcamentos.pendentes || 0);

  const elOrcAprovados = document.getElementById("kpiOrcamentosAprovados");
  if (elOrcAprovados) elOrcAprovados.textContent = String(orcamentos.aprovados || 0);

  const elOrcNegados = document.getElementById("kpiOrcamentosNegados");
  if (elOrcNegados) elOrcNegados.textContent = String(orcamentos.negados || 0);
}

function atualizarDashboard(dados) {
  if (!dados) return;

  atualizarKpis(dados);
  renderizarEscolas(dados.escolas);
  renderizarListaPagamentos(
    "listaProximosPagamentos",
    dados.proximos_pagamentos,
    "data_vencimento",
    "laranja",
    "Nenhum pagamento previsto para os próximos 5 dias."
  );
  renderizarListaPagamentos(
    "listaUltimosPagamentos",
    dados.ultimos_pagamentos,
    "data_pagamento",
    "verde",
    "Nenhum pagamento recebido nos últimos 5 dias."
  );
  atualizarDocumentosEOrcamentos(dados);
}

const MESES_ANO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function iniciarGrafico(dados) {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("graficoFinanceiro");
  if (!canvas) return;

  const graficoExistente = Chart.getChart(canvas);
  if (graficoExistente) {
    graficoExistente.destroy();
  }

  // Usa exclusivamente os dados reais vindos do banco (via API). Quando não
  // há retorno da API, exibe os 12 meses reais zerados — nunca dados fictícios.
  const listaMensal = Array.isArray(dados?.grafico_mensal) && dados.grafico_mensal.length
    ? dados.grafico_mensal
    : MESES_ANO.map((mes) => ({ mes, receita: 0, despesa: 0 }));
  const labels = listaMensal.map((item) => item.mes);
  const receita = listaMensal.map((item) => Number(item.receita || 0));
  const despesa = listaMensal.map((item) => Number(item.despesa || 0));

  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Receita",
          data: receita,
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.08)",
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#10B981",
        },
        {
          label: "Despesa",
          data: despesa,
          borderColor: "#EF4444",
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#EF4444",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `R$ ${val}`,
            color: "#6B7280",
          },
          grid: { color: "#F3F4F6" },
        },
        x: {
          ticks: { color: "#6B7280" },
          grid: { display: false },
        },
      },
    },
  });
}

/* ==========================================================================
   INICIALIZAÇÃO
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  initMenu();

  const dashboardRoot = document.getElementById("kpiReceita");
  let dados = null;

  if (dashboardRoot && window.API) {
    try {
      dados = await window.API.get("/dashboard/resumo");
      atualizarDashboard(dados);
      iniciarGrafico(dados);
    } catch (error) {
      console.error("Erro ao carregar dados do painel:", error);
      showError("Não foi possível carregar os dados do painel.");
      iniciarGrafico(null);
    }
  } else {
    iniciarGrafico(null);
  }
});
