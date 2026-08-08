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

/* ==========================================================================
   CARREGAMENTO
   ========================================================================== */

async function carregarDashboard() {
  try {
    return await window.API.get("/dashboard/resumo");
  } catch (error) {
    console.error("Erro ao carregar dados do dashboard:", error);
    showError("Não foi possível carregar o dashboard.");
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

function atualizarDashboard(dados) {
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
  if (barraPresenca) barraPresenca.style.width = `${presencaMedia}%`;

  const elMonitores = document.getElementById("kpiMonitores");
  if (elMonitores) elMonitores.textContent = String(dados.monitores_ativos || 0);

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

  renderizarEscolas(dados.escolas);
  renderizarProximosPagamentos(dados.proximos_pagamentos);
  renderizarUltimosPagamentos(dados.ultimos_pagamentos);
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

function renderizarProximosPagamentos(pagamentos) {
  const lista = document.getElementById("listaProximosPagamentos");
  if (!lista) return;

  if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
    lista.innerHTML = '<p class="aviso-sem-dados">Nenhum pagamento próximo encontrado.</p>';
    return;
  }

  lista.innerHTML = pagamentos
    .map((item) => {
      return `<div class="item-pagamento"><span class="nome-pagamento">${item.nome_aluno}</span><span class="data-pagamento">${formatarDataBR(item.data_vencimento)}</span><span class="valor-pagamento laranja">${formatarBRL(item.valor)}</span></div>`;
    })
    .join("");
}

function renderizarUltimosPagamentos(pagamentos) {
  const lista = document.getElementById("listaUltimosPagamentos");
  if (!lista) return;

  if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
    lista.innerHTML = '<p class="aviso-sem-dados">Nenhum pagamento recente encontrado.</p>';
    return;
  }

  lista.innerHTML = pagamentos
    .map((item) => {
      return `<div class="item-pagamento"><span class="nome-pagamento">${item.nome_aluno}</span><span class="data-pagamento">${formatarDataBR(item.data_pagamento)}</span><span class="valor-pagamento verde">${formatarBRL(item.valor)}</span></div>`;
    })
    .join("");
}

function iniciarGrafico(dados) {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("graficoFinanceiro");
  if (!canvas) return;

  const graficoExistente = Chart.getChart(canvas);
  if (graficoExistente) {
    graficoExistente.destroy();
  }

  const listaMensal = Array.isArray(dados?.grafico_mensal) ? dados.grafico_mensal : [];
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

  const dados = await carregarDashboard();
  if (!dados) {
    renderizarEstadoErro();
    return;
  }

  atualizarDashboard(dados);
  iniciarGrafico(dados);
});
