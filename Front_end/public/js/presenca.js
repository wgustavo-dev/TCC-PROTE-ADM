let registros = [];
let registrosExistentes = [];

// === Linha de Trajeto ===
// A ordem exibida vem do módulo Itinerário (GET /itinerarios), que já
// entrega os alunos agrupados por período (manha/tarde/noite) e ordenados
// pela "ordem" definida lá. Aqui só cruzamos essa ordem com quem está
// PRESENTE no dia selecionado — quem está ausente simplesmente não entra
// na lista filtrada e não aparece na linha.
let itinerarioPorPeriodo = { manha: [], tarde: [], noite: [] };
let periodoAtivoTrajeto = "manha";
let tabInicialDefinida = false;
const pegosPorPeriodo = { manha: new Set(), tarde: new Set(), noite: new Set() };

// Guarda quem já foi "pego" na linha no localStorage, por data — assim o
// progresso sobrevive a um F5 na página. Uma data nova (viagem nova) começa
// do zero, mas recarregar a mesma data mantém o que já foi marcado.
function chaveStorageTrajeto(dataISO) {
  return `prote_trajeto_pegos_${dataISO}`;
}

function salvarPegosNoStorage() {
  const dados = {
    manha: Array.from(pegosPorPeriodo.manha),
    tarde: Array.from(pegosPorPeriodo.tarde),
    noite: Array.from(pegosPorPeriodo.noite),
  };
  try {
    window.localStorage.setItem(chaveStorageTrajeto(campoData.value), JSON.stringify(dados));
  } catch (erro) {
    console.error(erro);
  }
}

function carregarPegosDoStorage(dataISO) {
  try {
    const bruto = window.localStorage.getItem(chaveStorageTrajeto(dataISO));
    if (!bruto) return { manha: [], tarde: [], noite: [] };
    const dados = JSON.parse(bruto);
    return {
      manha: Array.isArray(dados.manha) ? dados.manha : [],
      tarde: Array.isArray(dados.tarde) ? dados.tarde : [],
      noite: Array.isArray(dados.noite) ? dados.noite : [],
    };
  } catch (erro) {
    console.error(erro);
    return { manha: [], tarde: [], noite: [] };
  }
}

const iconeCasaSVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
  '<path d="M3 11l9-8 9 8"></path><path d="M5 10v10h14V10"></path></svg>';

const campoData = document.getElementById("campoData");
const listaAlunos = document.getElementById("listaAlunosPresenca");
const totalPresentes = document.getElementById("totalPresentes");
const totalAusentes = document.getElementById("totalAusentes");
const taxaPresenca = document.getElementById("taxaPresenca");
const barraTaxa = document.getElementById("barraTaxaPreenchimento");
const textoDataLista = document.getElementById("textoDataLista");
const botaoMarcarTodos = document.getElementById("botaoMarcarTodos");
const botaoDesmarcarTodos = document.getElementById("botaoDesmarcarTodos");
const botaoSalvar = document.getElementById("botaoSalvarChamada");

function initMenu() {
  const botaoMenu = document.getElementById("botaoMenu");
  const sidebar = document.getElementById("sidebar");
  const fundoEscuro = document.getElementById("fundoEscuro");
  if (!botaoMenu || !sidebar || !fundoEscuro) return;
  botaoMenu.addEventListener("click", () => {
    sidebar.classList.toggle("aberta");
    fundoEscuro.classList.toggle("visivel");
  });
  fundoEscuro.addEventListener("click", () => {
    sidebar.classList.remove("aberta");
    fundoEscuro.classList.remove("visivel");
  });
}

function definirDataAtual() {
  const hoje = new Date();
  const hojeISO = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0"),
  ].join("-");

  campoData.max = hojeISO;
  campoData.value = hojeISO;
}

function dataEhFutura(data) {
  return Boolean(data && campoData.max && data > campoData.max);
}

function formatarDataBR(data) {
  if (!data) return "";
  const partes = data.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function toUrlFoto(pathFoto) {
  if (!pathFoto) return "";
  if (pathFoto.startsWith("http")) return pathFoto;
  return `http://localhost:3000${pathFoto}`;
}

async function carregarAlunosBase() {
  const alunos = await window.API.get("/alunos");
  return (alunos || []).map((aluno) => ({
    id: aluno.id_aluno,
    nome: aluno.nome,
    foto: toUrlFoto(aluno.foto),
    presente: false,
  }));
}

async function carregarPresencasPorData(dataISO) {
  try {
    const data = await window.API.get(`/presencas/data/${dataISO}`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function carregarItinerario() {
  try {
    const dados = await window.API.get("/itinerarios");
    return {
      manha: Array.isArray(dados?.manha) ? dados.manha : [],
      tarde: Array.isArray(dados?.tarde) ? dados.tarde : [],
      noite: Array.isArray(dados?.noite) ? dados.noite : [],
    };
  } catch (error) {
    console.error(error);
    return { manha: [], tarde: [], noite: [] };
  }
}

async function atualizarDadosTela() {
  const [alunosBase, presencasData, itinerario] = await Promise.all([
    carregarAlunosBase(),
    carregarPresencasPorData(campoData.value),
    carregarItinerario(),
  ]);

  registrosExistentes = presencasData;
  const statusPorAluno = new Map(presencasData.map((p) => [p.id_aluno, p.status]));

  registros = alunosBase.map((item) => ({
    ...item,
    presente: statusPorAluno.get(item.id) === "PRESENTE",
  }));

  itinerarioPorPeriodo = itinerario;

  // Recupera o progresso salvo para esta data (sobrevive a um F5). Se a
  // data for outra, o storage simplesmente não tem nada e a linha começa
  // do zero — é uma viagem nova.
  const salvos = carregarPegosDoStorage(campoData.value);
  pegosPorPeriodo.manha = new Set(salvos.manha);
  pegosPorPeriodo.tarde = new Set(salvos.tarde);
  pegosPorPeriodo.noite = new Set(salvos.noite);

  if (!tabInicialDefinida) {
    periodoAtivoTrajeto =
      ["manha", "tarde", "noite"].find((periodo) => itinerario[periodo].length > 0) || "manha";
    document.querySelectorAll(".trajeto-tab").forEach((botao) => {
      botao.classList.toggle("ativo", botao.dataset.periodo === periodoAtivoTrajeto);
    });
    tabInicialDefinida = true;
  }

  renderizarLista();
  atualizarResumo();
  renderizarTrajetoLinha();
}

function listaTrajetoFiltrada(periodo) {
  const presentesIds = new Set(registros.filter((aluno) => aluno.presente).map((aluno) => aluno.id));
  return (itinerarioPorPeriodo[periodo] || []).filter((item) => presentesIds.has(item.alunoId));
}

function fotoDoAluno(alunoId) {
  const aluno = registros.find((item) => item.id === alunoId);
  return aluno && aluno.foto ? aluno.foto : "";
}

function rotuloPeriodo(periodo) {
  return { manha: "manhã", tarde: "tarde", noite: "noite" }[periodo] || periodo;
}

function paradaCasaHTML(titulo) {
  return `
    <div class="trajeto-parada trajeto-parada--casa">
      <div class="trajeto-parada-icone casa">${iconeCasaSVG}</div>
      <div class="trajeto-parada-legenda">
        <span class="trajeto-parada-titulo">${titulo}</span>
      </div>
    </div>`;
}

function paradaAlunoHTML(item, index, pego, atual) {
  const classes = ["trajeto-parada", "trajeto-parada--aluno"];
  if (pego) classes.push("pego");
  if (atual) classes.push("atual");
  const numero = String(index + 1).padStart(2, "0");
  const foto = fotoDoAluno(item.alunoId);
  // Foto é opcional — sem ela, cai no número da ordem como hoje.
  const conteudoAvatar = foto
    ? `<img class="trajeto-avatar-foto" src="${foto}" alt="${item.nome}" loading="lazy" onerror="this.remove()">`
    : `<span class="trajeto-avatar-numero">${numero}</span>`;

  return `
    <div class="${classes.join(" ")}" data-aluno-id="${item.alunoId}" data-index="${index}">
      <div class="trajeto-avatar">
        ${conteudoAvatar}
        <span class="trajeto-avatar-check">✓</span>
      </div>
      <div class="trajeto-parada-legenda">
        <span class="trajeto-parada-titulo">${item.nome}</span>
        <span class="trajeto-parada-sub" title="${item.endereco || ""}">${item.endereco || ""}</span>
        <span class="tipo-badge tipo-badge--${item.tipo}">${item.tipo === "ida" ? "IDA" : "VOLTA"}</span>
      </div>
    </div>`;
}

function renderizarTrajetoLinha() {
  const lista = listaTrajetoFiltrada(periodoAtivoTrajeto);
  const pegos = pegosPorPeriodo[periodoAtivoTrajeto];

  // remove da lista de "pegos" quem saiu da linha (ex.: virou ausente)
  let mudou = false;
  Array.from(pegos).forEach((id) => {
    if (!lista.some((item) => item.alunoId === id)) {
      pegos.delete(id);
      mudou = true;
    }
  });
  if (mudou) salvarPegosNoStorage();

  document.getElementById("trajetoBadgeAlunos").textContent =
    `${lista.length} aluno${lista.length === 1 ? "" : "s"}`;

  const trajetoLinha = document.getElementById("trajetoLinha");

  if (!lista.length) {
    trajetoLinha.innerHTML = `<p class="trajeto-vazio">Nenhum aluno presente neste período.</p>`;
    return;
  }

  const indiceAtual = lista.findIndex((item) => !pegos.has(item.alunoId));
  const partes = [];

  partes.push(paradaCasaHTML("Início da rota"));
  partes.push(`<div class="trajeto-conector percorrido"></div>`);

  lista.forEach((item, index) => {
    const pego = pegos.has(item.alunoId);
    const atual = index === indiceAtual;
    partes.push(paradaAlunoHTML(item, index, pego, atual));
    if (index < lista.length - 1) {
      partes.push(`<div class="trajeto-conector ${pego ? "percorrido" : ""}"></div>`);
    }
  });

  partes.push(`<div class="trajeto-conector ${indiceAtual === -1 ? "percorrido" : ""}"></div>`);
  partes.push(paradaCasaHTML(`Fim de rota (${rotuloPeriodo(periodoAtivoTrajeto)})`));

  trajetoLinha.innerHTML = partes.join("");
}

document.getElementById("trajetoLinha").addEventListener("dblclick", (event) => {
  const parada = event.target.closest(".trajeto-parada--aluno");
  if (!parada) return;

  const alunoId = Number(parada.dataset.alunoId);
  const index = Number(parada.dataset.index);
  const pegos = pegosPorPeriodo[periodoAtivoTrajeto];
  const lista = listaTrajetoFiltrada(periodoAtivoTrajeto);
  const indiceAtual = lista.findIndex((item) => !pegos.has(item.alunoId));

  if (index === indiceAtual) {
    // duplo clique no aluno atual: marca como embarcado e avança a linha
    pegos.add(alunoId);
  } else if (index === indiceAtual - 1) {
    // duplo clique no último aluno já embarcado: desfaz e volta a linha
    pegos.delete(alunoId);
  } else {
    return;
  }

  salvarPegosNoStorage();
  renderizarTrajetoLinha();
});

document.getElementById("trajetoTabs").addEventListener("click", (event) => {
  const botao = event.target.closest(".trajeto-tab");
  if (!botao) return;

  periodoAtivoTrajeto = botao.dataset.periodo;
  document.querySelectorAll(".trajeto-tab").forEach((b) => b.classList.toggle("ativo", b === botao));
  renderizarTrajetoLinha();
});

function atualizarResumo() {
  const presentes = registros.filter((aluno) => aluno.presente).length;
  const ausentes = registros.length - presentes;
  const taxa = registros.length ? Math.round((presentes / registros.length) * 100) : 0;
  totalPresentes.textContent = String(presentes);
  totalAusentes.textContent = String(ausentes);
  taxaPresenca.textContent = `${taxa.toFixed(1)}%`;
  barraTaxa.style.width = `${taxa}%`;
}

function renderizarLista() {
  textoDataLista.textContent = `Registro de presença do dia ${formatarDataBR(campoData.value)}`;
  listaAlunos.innerHTML = registros
    .map(
      (aluno) => `
    <div class="aluno-presenca">
      <div class="info-aluno-presenca">
        <div class="avatar-presenca">${(aluno.nome || "?").charAt(0)}</div>
        <div>
          <div class="nome-aluno-presenca">${aluno.nome}</div>
          <div class="id-aluno-presenca">ID: ${aluno.id}</div>
        </div>
      </div>
      <button class="botao-status ${aluno.presente ? "presente" : "ausente"}" data-id="${aluno.id}">
        ${aluno.presente ? "Presente" : "Ausente"}
      </button>
    </div>`
    )
    .join("");
}

listaAlunos.addEventListener("click", (event) => {
  const botao = event.target.closest(".botao-status");
  if (!botao) return;
  const id = Number(botao.dataset.id);
  registros = registros.map((aluno) => (aluno.id === id ? { ...aluno, presente: !aluno.presente } : aluno));
  renderizarLista();
  atualizarResumo();
  renderizarTrajetoLinha();
});

botaoMarcarTodos.addEventListener("click", () => {
  registros = registros.map((aluno) => ({ ...aluno, presente: true }));
  renderizarLista();
  atualizarResumo();
  renderizarTrajetoLinha();
});

botaoDesmarcarTodos.addEventListener("click", () => {
  registros = registros.map((aluno) => ({ ...aluno, presente: false }));
  renderizarLista();
  atualizarResumo();
  renderizarTrajetoLinha();
});

campoData.addEventListener("change", () => {
  if (dataEhFutura(campoData.value)) {
    campoData.value = campoData.max;
    showError("Não é possível consultar ou criar uma presença com data futura.");
    return;
  }

  atualizarDadosTela();
});

botaoSalvar.addEventListener("click", async () => {
  if (dataEhFutura(campoData.value)) {
    showError("Não é possível criar uma presença com data futura.");
    return;
  }

  try {
    const porAluno = new Map(registrosExistentes.map((item) => [item.id_aluno, item]));
    const operacoes = registros.map((item) => {
      const payload = {
        id_aluno: item.id,
        data: campoData.value,
        status: item.presente ? "PRESENTE" : "AUSENTE",
      };
      const existente = porAluno.get(item.id);
      if (existente?.id_presenca) return window.API.put(`/presencas/${existente.id_presenca}`, payload);
      return window.API.post("/presencas", payload);
    });

    await Promise.all(operacoes);
    await atualizarDadosTela();
    showSuccess("Registro da chamada salvo com sucesso!");
  } catch (error) {
    console.error(error);
    showError(error.message || "Não foi possível salvar a chamada.");
  }
});

window.addEventListener("DOMContentLoaded", async () => {
  initMenu();
  definirDataAtual();
  await atualizarDadosTela();
});
