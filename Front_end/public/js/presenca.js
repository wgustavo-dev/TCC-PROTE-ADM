let registros = [];
let registrosExistentes = [];

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
  campoData.value = new Date().toISOString().split("T")[0];
}

function formatarDataBR(data) {
  if (!data) return "";
  const partes = data.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

async function carregarAlunosBase() {
  const alunos = await window.API.get("/alunos");
  return (alunos || []).map((aluno) => ({
    id: aluno.id_aluno,
    nome: aluno.nome,
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

async function atualizarDadosTela() {
  const [alunosBase, presencasData] = await Promise.all([
    carregarAlunosBase(),
    carregarPresencasPorData(campoData.value),
  ]);

  registrosExistentes = presencasData;
  const statusPorAluno = new Map(presencasData.map((p) => [p.id_aluno, p.status]));

  registros = alunosBase.map((item) => ({
    ...item,
    presente: statusPorAluno.get(item.id) === "PRESENTE",
  }));

  renderizarLista();
  atualizarResumo();
}

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
});

botaoMarcarTodos.addEventListener("click", () => {
  registros = registros.map((aluno) => ({ ...aluno, presente: true }));
  renderizarLista();
  atualizarResumo();
});

botaoDesmarcarTodos.addEventListener("click", () => {
  registros = registros.map((aluno) => ({ ...aluno, presente: false }));
  renderizarLista();
  atualizarResumo();
});

campoData.addEventListener("change", atualizarDadosTela);

botaoSalvar.addEventListener("click", async () => {
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
    showError("Não foi possível salvar a chamada.");
  }
});

window.addEventListener("DOMContentLoaded", async () => {
  initMenu();
  definirDataAtual();
  await atualizarDadosTela();
});
