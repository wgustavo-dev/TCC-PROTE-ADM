function initMenu() {
  const botaoMenu = document.getElementById("botaoMenu");
  const sidebar = document.getElementById("sidebar");
  const fundoEscuro = document.getElementById("fundoEscuro");
  if (!botaoMenu || !sidebar || !fundoEscuro) return;
  botaoMenu.addEventListener("click", () => {
    sidebar.classList.toggle("aberta");
    fundoEscuro.classList.toggle("visivel");
    botaoMenu.classList.toggle("aberto");
  });
  fundoEscuro.addEventListener("click", () => {
    sidebar.classList.remove("aberta");
    fundoEscuro.classList.remove("visivel");
    botaoMenu.classList.remove("aberto");
  });
}

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

function atualizarDashboard(dados) {
  document.getElementById("kpiReceita").textContent = formatarBRL(dados.receita_mensal);
  document.getElementById("kpiDespesas").textContent = formatarBRL(dados.despesas_mensais);
  document.getElementById("kpiLucro").textContent = formatarBRL(dados.lucro_mensal);
  document.getElementById("kpiAlunos").textContent = String(dados.alunos_ativos || 0);
  document.getElementById("kpiPresenca").textContent = `${Number(dados.presenca_media || 0).toFixed(1)}%`;
  document.getElementById("barraPresenca").style.width = `${dados.presenca_media || 0}%`;

  document.getElementById("resumoReceita").textContent = formatarBRL(dados.resumo_financeiro?.receita_total);
  document.getElementById("resumoDespesas").textContent = formatarBRL(dados.resumo_financeiro?.despesas_total);
  document.getElementById("resumoSaldo").textContent = formatarBRL(dados.resumo_financeiro?.saldo_mensal);

  const saldo = Number(dados.resumo_financeiro?.saldo_mensal || 0);
  const banner = document.getElementById("bannerSaldo");
  const titulo = document.getElementById("tituloBanner");
  const descricao = document.getElementById("descricaoBanner");

  if (saldo >= 0) {
    banner.classList.remove("negativo");
    titulo.textContent = "Operacao saudavel este mes!";
    descricao.textContent = "Continue monitorando as despesas e receitas.";
  } else {
    banner.classList.add("negativo");
    titulo.textContent = "Atencao: saldo negativo!";
    descricao.textContent = "Suas despesas estao superando a receita.";
  }
}

function renderizarAlertas(alertas) {
  const lista = document.getElementById("listaAlertas");
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

function iniciarMapa() {
  if (typeof L === "undefined") return;
  const mapa = L.map("mapa-rotas", { zoomControl: true, scrollWheelZoom: false }).setView([-23.5489, -46.6388], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(mapa);
}

function iniciarGrafico(dados) {
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("graficoFinanceiro");
  if (!canvas) return;

  const labels = (dados.grafico_mensal || []).map((item) => item.mes);
  const receita = (dados.grafico_mensal || []).map((item) => Number(item.receita || 0));
  const despesa = (dados.grafico_mensal || []).map((item) => Number(item.despesa || 0));

  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Receita", data: receita, borderColor: "#16a34a", backgroundColor: "rgba(22,163,74,0.08)", borderWidth: 2, fill: true, tension: 0.4 },
        { label: "Despesa", data: despesa, borderColor: "#dc2626", backgroundColor: "rgba(220,38,38,0.06)", borderWidth: 2, fill: true, tension: 0.4 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  initMenu();
  iniciarMapa();

  const dashboardRoot = document.getElementById("kpiReceita");
  if (!dashboardRoot) return;

  try {
    const dados = await window.API.get("/dashboard/resumo");
    atualizarDashboard(dados);
    renderizarAlertas(dados.alertas);
    iniciarGrafico(dados);
  } catch (error) {
    console.error(error);
    alert("Nao foi possivel carregar o dashboard.");
  }
});
