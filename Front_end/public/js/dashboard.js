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

function formatarVencimentoRelativo(dataISO) {
  if (!dataISO) return "";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vencimento = new Date(`${String(dataISO).slice(0, 10)}T00:00:00`);
  vencimento.setHours(0, 0, 0, 0);

  const diffDias = Math.round((hoje - vencimento) / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return "hoje";
  if (diffDias === 1) return "ontem";
  return formatarDataBR(dataISO);
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

function iniciarMapa() {
  if (typeof L === "undefined") return;
  const elementoMapa = document.getElementById("mapa-rotas");
  if (!elementoMapa) return;

  const mapa = L.map("mapa-rotas", { zoomControl: true, scrollWheelZoom: false }).setView([-23.5489, -46.6388], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(mapa);
}

function atualizarDashboard(dados) {
  if (!dados) return;

  // KPIs Superiores
  const elReceita = document.getElementById("kpiReceita");
  if (elReceita) elReceita.textContent = formatarBRL(dados.receita_mensal);

  const elDespesas = document.getElementById("kpiDespesas");
  if (elDespesas) elDespesas.textContent = formatarBRL(dados.despesas_mensais);

  const elLucro = document.getElementById("kpiLucro");
  if (elLucro) elLucro.textContent = formatarBRL(dados.lucro_mensal);

  const elAlunos = document.getElementById("kpiAlunos");
  if (elAlunos) elAlunos.textContent = String(dados.alunos_ativos || 0);

  const elPresenca = document.getElementById("kpiPresenca");
  if (elPresenca) elPresenca.textContent = `${Number(dados.presenca_media || 0).toFixed(1)}%`;

  const barraPresenca = document.getElementById("barraPresenca");
  if (barraPresenca) barraPresenca.style.width = `${dados.presenca_media || 0}%`;

  // Documentos
  const documentos = dados.documentos || {};
  const elDocsVencidos = document.getElementById("kpiDocsVencidos");
  if (elDocsVencidos) elDocsVencidos.textContent = `${Number(documentos.vencidos || 0)} vencidos`;

  const elDocsBreve = document.getElementById("kpiDocsVencemBreve");
  if (elDocsBreve) elDocsBreve.textContent = `${Number(documentos.vencem_em_ate_7_dias || 0)} vencem em até 7 dias`;

  // Resumo
  const elResumoReceita = document.getElementById("resumoReceita");
  if (elResumoReceita) elResumoReceita.textContent = formatarBRL(dados.resumo_financeiro?.receita_total);

  const elResumoDespesas = document.getElementById("resumoDespesas");
  if (elResumoDespesas) elResumoDespesas.textContent = formatarBRL(dados.resumo_financeiro?.despesas_total);

  const elResumoSaldo = document.getElementById("resumoSaldo");
  if (elResumoSaldo) elResumoSaldo.textContent = formatarBRL(dados.resumo_financeiro?.saldo_mensal);

  // Banner
  const saldo = Number(dados.resumo_financeiro?.saldo_mensal || 0);
  const banner = document.getElementById("bannerSaldo");
  const titulo = document.getElementById("tituloBanner");
  const descricao = document.getElementById("descricaoBanner");

  if (banner && titulo && descricao) {
    if (saldo >= 0) {
      banner.classList.remove("negativo");
      titulo.textContent = "Operação saudável este mês!";
      descricao.textContent = "Continue monitorando as despesas e receitas.";
    } else {
      banner.classList.add("negativo");
      titulo.textContent = "Atenção: saldo negativo!";
      descricao.textContent = "Suas despesas estão superando a receita.";
    }
  }
}

function renderizarAlertas(alertas) {
  const lista = document.getElementById("listaAlertas");
  if (!lista) return;

  if (!Array.isArray(alertas) || !alertas.length) {
    lista.innerHTML = '<p class="aviso-sem-dados">Nenhum alerta no momento.</p>';
    return;
  }

  const alertasOrdenados = [...alertas].sort((a, b) => {
    const diffDias = (b.dias_atraso ?? 0) - (a.dias_atraso ?? 0);
    if (diffDias !== 0) return diffDias;
    return String(a.nome_aluno || "").localeCompare(String(b.nome_aluno || ""));
  });

  lista.innerHTML = alertasOrdenados
    .map((item) => {
      const nomeAluno = item.nome_aluno || "Aluno";

      if (item.tipo === "vence_hoje") {
        return `<div class="alerta alerta-amarelo"><p class="titulo-alerta amarelo">${nomeAluno}</p><p class="descricao-alerta amarelo">A mensalidade de ${nomeAluno} vence hoje.</p></div>`;
      }

      const quando = formatarVencimentoRelativo(item.data_vencimento);
      return `<div class="alerta alerta-vermelho"><p class="titulo-alerta vermelho">${nomeAluno}</p><p class="descricao-alerta vermelho">A mensalidade de ${nomeAluno} venceu ${quando}.</p></div>`;
    })
    .join("");
}

function iniciarGrafico(dados) {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("graficoFinanceiro");
  if (!canvas) return;

  // Destrói gráfico antigo se existir
  const graficoExistente = Chart.getChart(canvas);
  if (graficoExistente) {
    graficoExistente.destroy();
  }

  // Dados vindos da API ou Fallback estático caso a API não traga a propriedade
  const listaMensal = dados?.grafico_mensal;
  
  const labels = listaMensal 
    ? listaMensal.map((item) => item.mes) 
    : ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
    
  const receita = listaMensal 
    ? listaMensal.map((item) => Number(item.receita || 0)) 
    : [10000, 12000, 16000, 13000, 16500, 14000];
    
  const despesa = listaMensal 
    ? listaMensal.map((item) => Number(item.despesa || 0)) 
    : [6000, 7500, 9000, 8000, 11000, 9500];

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
          pointBackgroundColor: "#10B981"
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
          pointBackgroundColor: "#EF4444"
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `R$ ${val}`,
            color: "#6B7280"
          },
          grid: { color: "#F3F4F6" }
        },
        x: {
          ticks: { color: "#6B7280" },
          grid: { display: false }
        }
      }
    },
  });
}

/* ==========================================================================
   INICIALIZAÇÃO ÚNICA DA PÁGINA
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  initMenu();
  iniciarMapa();

  // Tenta carregar dados da API se o endpoint e o elemento raiz existirem
  const dashboardRoot = document.getElementById("kpiReceita");
  
  if (dashboardRoot && window.API) {
    try {
      const dados = await window.API.get("/dashboard/resumo");
      atualizarDashboard(dados);
      renderizarAlertas(dados.alertas);
      iniciarGrafico(dados);
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      const lista = document.getElementById("listaAlertas");
      if (lista) lista.innerHTML = '<p class="aviso-sem-dados">Não foi possível carregar o dashboard.</p>';
      
      // Carrega o gráfico com fallback em caso de erro da API
      iniciarGrafico(null);
    }
  } else {
    // Caso esteja testando localmente sem a API conectada
    iniciarGrafico(null);
  }
});