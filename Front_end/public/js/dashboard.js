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

  lista.innerHTML = alertas
    .map((item) => `<div class="alerta alerta-vermelho"><p class="titulo-alerta vermelho">Alerta</p><p class="descricao-alerta vermelho">${item}</p></div>`)
    .join("");
}

/*
   LINHA DE ROTA — estilo metrô, SVG puro
   1. Busca alunos da API (/alunos)
   2. Busca presenças de hoje (/presencas/data/DATA)
   3. Filtra só os presentes que têm endereço de embarque
   4. Desenha a linha SVG com paradas e nomes inclinados
*/
async function iniciarMapa() {
  const container = document.getElementById("linha-rota");
  const aviso = document.getElementById("avisoRota");
  if (!container) return;

  function exibirAviso(texto) {
    if (aviso) aviso.textContent = texto;
  }

  /* Busca alunos e presenças de hoje em paralelo */
  const dataHoje = new Date().toISOString().split("T")[0];
  let todosAlunos, presencasHoje;

  try {
    [todosAlunos, presencasHoje] = await Promise.all([
      window.API.get("/alunos"),
      window.API.get(`/presencas/data/${dataHoje}`),
    ]);
  } catch (erro) {
    console.error("Linha de rota: erro ao buscar dados:", erro);
    exibirAviso("Não foi possível carregar a rota.");
    return;
  }

  /* IDs dos alunos presentes hoje */
  const idsPresentes = new Set(
    (presencasHoje || [])
      .filter((p) => p.status === "PRESENTE")
      .map((p) => p.id_aluno)
  );

  /* Monta lista de paradas: só presentes com endereço de embarque */
  const paradas = (todosAlunos || [])
    .filter((a) => idsPresentes.has(a.id_aluno) && a.endereco_embarque)
    .map((a) => ({
      nome: a.nome,
      endereco: a.endereco_embarque,
    }));

  if (paradas.length === 0) {
    exibirAviso(
      presencasHoje?.length
        ? "Nenhum aluno presente hoje."
        : "Chamada não registrada ainda."
    );
    return;
  }

  /* Remove o aviso e desenha o SVG */
  if (aviso) aviso.style.display = "none";
  container.appendChild(desenharLinhaSVG(paradas));
}

/*
   Gera e retorna um elemento <svg> com a linha de rota.
   Cada parada tem: círculo branco com borda azul + nome inclinado.
   A linha horizontal conecta todos os círculos.
*/
function desenharLinhaSVG(paradas) {
  const ESPACO_ENTRE = 88;   /* distância horizontal entre paradas (px) */
  const RAIO_CIRCULO = 10;   /* raio dos círculos de parada */
  const ALTURA_NOMES = 110;  /* espaço reservado para os nomes acima da linha */
  const Y_LINHA = ALTURA_NOMES + RAIO_CIRCULO; /* posição vertical da linha */
  const MARGEM_LATERAL = 32;

  const largura = MARGEM_LATERAL * 2 + (paradas.length - 1) * ESPACO_ENTRE;
  const altura = Y_LINHA + RAIO_CIRCULO + 16;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(largura));
  svg.setAttribute("height", String(altura));
  svg.setAttribute("viewBox", `0 0 ${largura} ${altura}`);

  /* Linha principal (trilho) */
  const linha = document.createElementNS("http://www.w3.org/2000/svg", "line");
  linha.setAttribute("x1", String(MARGEM_LATERAL));
  linha.setAttribute("y1", String(Y_LINHA));
  linha.setAttribute("x2", String(largura - MARGEM_LATERAL));
  linha.setAttribute("y2", String(Y_LINHA));
  linha.setAttribute("stroke", "#1a56db");
  linha.setAttribute("stroke-width", "6");
  linha.setAttribute("stroke-linecap", "round");
  svg.appendChild(linha);

  paradas.forEach(function (parada, i) {
    const x = MARGEM_LATERAL + i * ESPACO_ENTRE;

    /* Grupo da parada — agrupa círculo + texto */
    const grupo = document.createElementNS("http://www.w3.org/2000/svg", "g");
    grupo.style.cursor = "default";

    /* Tooltip nativo via <title> */
    const titulo = document.createElementNS("http://www.w3.org/2000/svg", "title");
    titulo.textContent = parada.nome + "\n" + parada.endereco;
    grupo.appendChild(titulo);

    /* Círculo externo (borda azul) */
    const bordaCirculo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bordaCirculo.setAttribute("cx", String(x));
    bordaCirculo.setAttribute("cy", String(Y_LINHA));
    bordaCirculo.setAttribute("r", String(RAIO_CIRCULO));
    bordaCirculo.setAttribute("fill", "#1a56db");
    bordaCirculo.setAttribute("stroke", "#ffffff");
    bordaCirculo.setAttribute("stroke-width", "3");
    grupo.appendChild(bordaCirculo);

    /* Círculo interno branco */
    const centroCirculo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    centroCirculo.setAttribute("cx", String(x));
    centroCirculo.setAttribute("cy", String(Y_LINHA));
    centroCirculo.setAttribute("r", String(RAIO_CIRCULO - 4));
    centroCirculo.setAttribute("fill", "#ffffff");
    grupo.appendChild(centroCirculo);

    /* Nome inclinado — igual ao metrô */
    const texto = document.createElementNS("http://www.w3.org/2000/svg", "text");
    texto.setAttribute("x", String(x));
    texto.setAttribute("y", String(Y_LINHA - RAIO_CIRCULO - 6));
    texto.setAttribute("text-anchor", "start");
    texto.setAttribute("font-size", "12");
    texto.setAttribute("font-family", "Segoe UI, system-ui, sans-serif");
    texto.setAttribute("fill", "#111827");
    texto.setAttribute("transform", `rotate(-45, ${x}, ${Y_LINHA - RAIO_CIRCULO - 6})`);
    texto.textContent = parada.nome;
    grupo.appendChild(texto);

    svg.appendChild(grupo);
  });

  return svg;
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
