/* =========================================================
   ALERTAS PERSONALIZADOS - SWEETALERT2
   ========================================================= */

function showSuccess(message) {
  return Swal.fire({
    icon: "success",
    title: "Sucesso!",
    text: message,
    confirmButtonText: "OK",
    customClass: {
      popup: "prote-alert",
      title: "prote-alert-title",
      confirmButton: "prote-alert-button"
    },
    buttonsStyling: false
  });
}

function showError(message) {
  return Swal.fire({
    icon: "error",
    title: "Erro!",
    text: message,
    confirmButtonText: "OK",
    customClass: {
      popup: "prote-alert",
      title: "prote-alert-title",
      confirmButton: "prote-alert-button"
    },
    buttonsStyling: false
  });
}

function showWarning(message) {
  return Swal.fire({
    icon: "warning",
    title: "Atenção!",
    text: message,
    confirmButtonText: "OK",
    customClass: {
      popup: "prote-alert",
      title: "prote-alert-title",
      confirmButton: "prote-alert-button"
    },
    buttonsStyling: false
  });
}

function showConfirm(message) {
  return Swal.fire({
    icon: "warning",
    title: "Confirmar ação",
    text: message,
    showCancelButton: true,
    confirmButtonText: "Confirmar",
    cancelButtonText: "Cancelar",
    customClass: {
      popup: "prote-alert",
      title: "prote-alert-title",
      confirmButton: "prote-alert-button",
      cancelButton: "prote-alert-cancel-button"
    },
    buttonsStyling: false
  });
}

const API_BASE = "/api";

const botao = document.getElementById("botaoNovoOrcamento");
const modal = document.getElementById("fundoModal");
const cancelar = document.getElementById("botaoCancelar");
const salvarBtn = document.getElementById("botaoSalvar");
const tabelaLinhas = document.getElementById("linhasOrcamentos");

const campoId = document.getElementById("campoId");
const campoResponsavel = document.getElementById("campoResponsavel");
const campoTelefone = document.getElementById("campoTelefone");
const campoQuantidadeAlunos = document.getElementById("campoQuantidadeAlunos");
const campoBairro = document.getElementById("campoBairro");
const campoEscola = document.getElementById("campoEscola");
const campoTurno = document.getElementById("campoTurno");
const campoTrajeto = document.getElementById("campoTrajeto");
const campoEmbarque = document.getElementById("campoEmbarque");
const campoDesembarque = document.getElementById("campoDesembarque");
const campoBusca = document.getElementById("campoBusca");

let orcamentos = [];
let statusAtual = "pendente";
let idEmEdicao = null;

/* ================================
   ABRIR MODAL
================================ */
if (botao) {
  botao.addEventListener("click", () => {
    idEmEdicao = null;
    limparFormularioOrcamento();
    modal.classList.add("ativo");
  });
}

/* ================================
   FECHAR MODAL
================================ */
if (cancelar) {
  cancelar.addEventListener("click", () => {
    modal.classList.remove("ativo");
  });
}

/* ================================
   FECHAR CLICANDO FORA
================================ */
if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target.id === "fundoModal") {
      modal.classList.remove("ativo");
    }
  });
}

/* ================================
   FUNÇÕES AUXILIARES
================================ */
function limparFormularioOrcamento() {
  if (campoId) campoId.value = "";
  if (campoResponsavel) campoResponsavel.value = "";
  if (campoTelefone) campoTelefone.value = "";
  if (campoQuantidadeAlunos) campoQuantidadeAlunos.value = "";
  if (campoBairro) campoBairro.value = "";
  if (campoEscola) campoEscola.value = "";
  if (campoTurno) campoTurno.value = "";
  if (campoTrajeto) campoTrajeto.value = "";
  if (campoEmbarque) campoEmbarque.value = "";
  if (campoDesembarque) campoDesembarque.value = "";
}

function obterQuantidadeAlunos() {
  const quantidade = Number(campoQuantidadeAlunos?.value);

  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return null;
  }

  return quantidade;
}

function normalizarStatus(status) {
  const statusRaw = String(status || "PENDENTE").toUpperCase();

  if (statusRaw === "PENDENTE") {
    return {
      valor: "pendente",
      texto: "PENDENTE",
      classe: "pendente"
    };
  }

  if (statusRaw === "EM_CADASTRO") {
    return {
      valor: "em_cadastro",
      texto: "EM CADASTRO",
      classe: "pendente"
    };
  }

  if (statusRaw === "CONVERTIDO") {
    return {
      valor: "convertido",
      texto: "CONVERTIDO",
      classe: "aprovado"
    };
  }

  if (statusRaw === "RECUSADO") {
    return {
      valor: "reprovado",
      texto: "RECUSADO",
      classe: "reprovado"
    };
  }

  return {
    valor: "pendente",
    texto: statusRaw,
    classe: "pendente"
  };
}

async function obterMensagemErro(response) {
  try {
    const dados = await response.json();
    return dados.error || dados.erro || "Erro na requisição";
  } catch {
    return "Erro na requisição";
  }
}

/* ================================
   CARREGAR ORÇAMENTOS
================================ */
async function carregarOrcamentos() {
  try {
    const response = await fetch(`${API_BASE}/orcamentos`);

    if (!response.ok) {
      throw new Error("Erro ao buscar orçamentos");
    }

    const dados = await response.json();

    orcamentos = dados.map((o) => {
      const statusNormalizado = normalizarStatus(o.status);

      return {
        id: o.id_orcamento,
        nome: o.nome_responsavel,
        telefone: o.telefone,
        bairro: o.bairro,
        escola: o.escola,
        turno: o.turno,
        quantidade_alunos: Number(o.quantidade_alunos || 1),
        tipo_trajeto: o.tipo_trajeto,
        endereco_embarque: o.endereco_embarque,
        endereco_desembarque: o.endereco_desembarque,
        status: statusNormalizado.valor,
        statusTexto: statusNormalizado.texto,
        statusClasse: statusNormalizado.classe,
        convertido: !!o.convertido,
        data_solicitacao: o.data_solicitacao
      };
    });
  } catch (error) {
    console.error("Erro ao carregar orçamentos:", error);
    orcamentos = [];
  }
}

/* ================================
   RENDERIZAR TABELA
================================ */
function renderizarOrcamentos() {
  const busca = campoBusca ? campoBusca.value.trim().toLowerCase() : "";

  const filtrados = orcamentos.filter((o) => {
    const nome = String(o.nome || "").toLowerCase();
    const bateBusca = !busca || nome.includes(busca);
    const bateStatus = !statusAtual || o.status === statusAtual;
    return bateBusca && bateStatus;
  });

  if (!tabelaLinhas) return;

  if (filtrados.length === 0) {
    tabelaLinhas.innerHTML =
      '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum orçamento encontrado</td></tr>';
    return;
  }

  tabelaLinhas.innerHTML = filtrados.map((o) => `
    <tr>
      <td>${o.nome || "-"}</td>
      <td>${o.tipo_trajeto || "-"}</td>
      <td>${o.endereco_embarque || "-"}</td>
      <td>${o.endereco_desembarque || "-"}</td>
      <td><span class="status-badge status-${o.statusClasse}">${o.statusTexto}</span></td>
      <td>
        <div class="coluna-acoes">
          <button class="botao-acao editar" data-id="${o.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>

          <button class="botao-acao aprovar" data-id="${o.id}" title="Converter" ${o.status !== "pendente" ? "disabled" : ""}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>

          <button class="botao-acao excluir" data-id="${o.id}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  tabelaLinhas.removeEventListener("click", handleTabelaClick);
  tabelaLinhas.addEventListener("click", handleTabelaClick);
}

/* ================================
   CLIQUES DA TABELA
================================ */
async function handleTabelaClick(event) {
  const btn = event.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  if (!id) return;

  if (btn.classList.contains("editar")) {
    const orcamento = orcamentos.find((o) => String(o.id) === String(id));

    if (orcamento) {
      idEmEdicao = orcamento.id;

      if (campoId) campoId.value = orcamento.id;
      if (campoResponsavel) campoResponsavel.value = orcamento.nome || "";
      if (campoTelefone) campoTelefone.value = orcamento.telefone || "";
      if (campoQuantidadeAlunos) campoQuantidadeAlunos.value = orcamento.quantidade_alunos || 1;
      if (campoBairro) campoBairro.value = orcamento.bairro || "";
      if (campoEscola) campoEscola.value = orcamento.escola || "";
      if (campoTurno) campoTurno.value = orcamento.turno || "";
      if (campoTrajeto) campoTrajeto.value = orcamento.tipo_trajeto || "";
      if (campoEmbarque) campoEmbarque.value = orcamento.endereco_embarque || "";
      if (campoDesembarque) campoDesembarque.value = orcamento.endereco_desembarque || "";

      modal.classList.add("ativo");
    }
  }

  if (btn.classList.contains("aprovar")) {
    const resposta = await showConfirm("Converter este orçamento em novo cadastro?");

    if (resposta.isConfirmed) {
      converterOrcamento(id);
    }
  }

  if (btn.classList.contains("excluir")) {
    const resposta = await showConfirm("Excluir este orçamento?");

    if (resposta.isConfirmed) {
      excluirOrcamento(id);
    }
  }
}

/* ================================
   SALVAR ORÇAMENTO
================================ */
async function salvarOrcamento() {
  if (!campoResponsavel || !campoResponsavel.value.trim()) {
    showWarning("Informe o nome do responsável");
    return;
  }

  if (!campoTelefone || !campoTelefone.value.trim()) {
    showWarning("Informe o telefone do responsável");
    return;
  }

  const quantidadeAlunos = obterQuantidadeAlunos();

  if (!quantidadeAlunos) {
    showWarning("Informe a quantidade de alunos");
    return;
  }

  const payload = {
    nome_responsavel: campoResponsavel.value.trim(),
    telefone: campoTelefone.value.trim(),
    quantidade_alunos: quantidadeAlunos,
    bairro: campoBairro ? campoBairro.value.trim() : "",
    escola: campoEscola ? campoEscola.value.trim() : "",
    turno: campoTurno && campoTurno.value ? campoTurno.value : null,
    tipo_trajeto: campoTrajeto && campoTrajeto.value ? campoTrajeto.value : null,
    endereco_embarque: campoEmbarque ? campoEmbarque.value.trim() : "",
    endereco_desembarque: campoDesembarque ? campoDesembarque.value.trim() : "",
    data_solicitacao: new Date().toISOString().split("T")[0]
  };

  const url = idEmEdicao
    ? `${API_BASE}/orcamentos/${idEmEdicao}`
    : `${API_BASE}/orcamentos`;

  const method = idEmEdicao ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const mensagem = await obterMensagemErro(response);
      throw new Error(mensagem);
    }

    await carregarOrcamentos();
    renderizarOrcamentos();

    showSuccess("Orçamento salvo com sucesso!");
    modal.classList.remove("ativo");
  } catch (error) {
    console.error(error);
    showError(error.message || "Não foi possível salvar orçamento.");
  }
}

/* ================================
   CONVERTER ORÇAMENTO
================================ */
async function converterOrcamento(id) {
  try {
    const response = await fetch(`${API_BASE}/orcamentos/${id}/converter`, {
      method: "PUT"
    });

    if (!response.ok) {
      const mensagem = await obterMensagemErro(response);
      throw new Error(mensagem);
    }

    const resultado = await response.json();
    const idOrcamento = resultado.orcamento?.id_orcamento || id;

    window.location.href = `responsaveis.html?fluxo=orcamento&id_orcamento=${idOrcamento}`;
  } catch (error) {
    console.error(error);
    showError(error.message || "Não foi possível converter orçamento.");
  }
}

/* ================================
   EXCLUIR ORÇAMENTO
================================ */
async function excluirOrcamento(id) {
  try {
    const response = await fetch(`${API_BASE}/orcamentos/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const mensagem = await obterMensagemErro(response);
      throw new Error(mensagem);
    }

    await carregarOrcamentos();
    renderizarOrcamentos();

    showSuccess("Orçamento excluído com sucesso!");
  } catch (error) {
    console.error(error);
    showError(error.message || "Não foi possível excluir orçamento.");
  }
}

/* ================================
   MENU MOBILE
================================ */
function initMenuMobile() {
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

/* ================================
   EVENT LISTENERS
================================ */
if (salvarBtn) {
  salvarBtn.addEventListener("click", salvarOrcamento);
}

if (campoBusca) {
  campoBusca.addEventListener("input", renderizarOrcamentos);
}

/* Tabs de status */
const abasStatus = document.querySelectorAll(".aba-status");
abasStatus.forEach((aba) => {
  aba.addEventListener("click", () => {
    abasStatus.forEach((item) => item.classList.remove("active"));
    aba.classList.add("active");
    statusAtual = aba.dataset.status || "pendente";
    renderizarOrcamentos();
  });
});

/* ================================
   INICIALIZA
================================ */
document.addEventListener("DOMContentLoaded", () => {
  initMenuMobile();
  carregarOrcamentos().then(() => renderizarOrcamentos());
});