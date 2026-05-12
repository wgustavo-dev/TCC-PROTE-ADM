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


let mensalidades = [];
let alunos = [];
let idEditando = null;

const fotoMensalidade = document.getElementById("fotoMensalidade");
const previewFotoMensalidade = document.getElementById("previewFotoMensalidade");
const botaoFecharTopo = document.getElementById("btnFecharModalMensalidade");
const botaoNova = document.getElementById("botaoNovaMensalidade");
const fundoModal = document.getElementById("fundoModalMensalidade");
const botaoCancelar = document.getElementById("botaoCancelarMensalidade");
const botaoSalvar = document.getElementById("botaoSalvarMensalidade");
const campoBusca = document.getElementById("campoBuscaMensalidade");
const linhasTabela = document.getElementById("linhasMensalidades");



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

function configurarPreviewFotoMensalidade() {
  if (!fotoMensalidade || !previewFotoMensalidade) return;

  const avatar = document.getElementById("avatarModalMensalidade");
  const placeholder = document.getElementById("avatarPlaceholderMensalidade");

  fotoMensalidade.addEventListener("change", () => {
    const arquivo = fotoMensalidade.files[0];

    if (!arquivo) {
      previewFotoMensalidade.src = "";
      previewFotoMensalidade.style.display = "none";
      if (placeholder) placeholder.style.display = "block";
      if (avatar) avatar.classList.remove("com-foto");
      return;
    }

    const leitor = new FileReader();

    leitor.onload = (evento) => {
      previewFotoMensalidade.src = evento.target.result;
      previewFotoMensalidade.style.display = "block";
      if (placeholder) placeholder.style.display = "none";
      if (avatar) avatar.classList.add("com-foto");
    };

    leitor.readAsDataURL(arquivo);
  });
}

function formatarBRL(valor) {
  return "R$ " + Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarData(data) {
  if (!data) return "—";
  const valor = String(data).slice(0, 10).split("-");
  return `${valor[2]}/${valor[1]}/${valor[0]}`;
}

function mapearMensalidade(item) {
  return {
    id: item.id_mensalidade,
    idAluno: item.id_aluno,
    aluno: item.aluno?.nome || `Aluno #${item.id_aluno}`,
    responsavel: item.aluno?.responsavel?.nome || "Responsavel nao informado",
    valor: Number(item.valor || 0),
    vencimento: String(item.data_vencimento || "").slice(0, 10),
    pagamento: item.data_pagamento ? String(item.data_pagamento).slice(0, 10) : "",
    status: (item.status || "PENDENTE").toLowerCase(),
    contato: [item.aluno?.responsavel?.telefone].filter(Boolean),
    foto: item.aluno?.foto ? `http://localhost:3000${item.aluno.foto}` : "",
  };
}

async function carregarDados() {
  const [respMensalidades, respAlunos] = await Promise.all([window.API.get("/mensalidades"), window.API.get("/alunos")]);
  mensalidades = (respMensalidades || []).map(mapearMensalidade);
  alunos = respAlunos || [];
}

function badgeStatus(status) {
  if (status === "pago") return `<span class="status-badge status-pago">✔</span>`;
  if (status === "atrasado") return `<span class="status-badge status-atrasado">⚠</span>`;
  return `<span class="status-badge status-pendente">◌</span>`;
}

function atualizarResumo() {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };

  setText("resumoTotal", formatarBRL(mensalidades.reduce((acc, x) => acc + x.valor, 0)));
  setText("resumoPago", mensalidades.filter((x) => x.status === "pago").length);
  setText("resumoAtrasadas", mensalidades.filter((x) => x.status === "atrasado").length);
  setText("resumoPendentes", mensalidades.filter((x) => x.status === "pendente").length);
}

function renderizarTabela() {
  const busca = campoBusca.value.toLowerCase().trim();
  const listaFiltrada = mensalidades.filter((item) => item.aluno.toLowerCase().includes(busca));

  if (!listaFiltrada.length) {
    linhasTabela.innerHTML = "";
    document.getElementById("tabelaMensalidades").style.display = "none";
    document.getElementById("avisoVazioMensalidade").style.display = "block";
    return;
  }

  document.getElementById("tabelaMensalidades").style.display = "table";
  document.getElementById("avisoVazioMensalidade").style.display = "none";

  linhasTabela.innerHTML = listaFiltrada
    .map(
      (item) => `
    <tr>
      <td><div class="celula-aluno"><div class="avatar-tabela">${item.foto ? `<img src="${item.foto}" class="foto-tabela">` : ""}</div><div class="nome-aluno">${item.aluno}</div></div></td>
      <td>${formatarBRL(item.valor)}</td>
      <td>${formatarData(item.vencimento)}</td>
      <td>${badgeStatus(item.status)}</td>
      <td>${formatarData(item.pagamento)}</td>
      <td><div class="lista-contatos">${item.contato.map((fone) => `<span>${fone}</span>`).join("")}</div></td>
      <td><div class="area-acoes">
        <button class="botao-acao" data-acao="editar" data-id="${item.id}" title="Editar" aria-label="Editar mensalidade">
          <svg class="icone-acao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
          </svg>
        </button>
        <button class="botao-acao" data-acao="pagar" data-id="${item.id}" title="Marcar pago" aria-label="Marcar mensalidade como paga">
          <svg class="icone-acao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
        <button class="botao-acao" data-acao="excluir" data-id="${item.id}" title="Excluir" aria-label="Excluir mensalidade">
          <svg class="icone-acao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14H6L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
            <path d="M9 6V4h6v2"></path>
          </svg>
        </button>
      </div></td>
    </tr>`
    )
    .join("");
}

function preencherDadosModal(item) {
  document.getElementById("campoIdMensalidade").value = item?.id || "";
  document.getElementById("campoAlunoMensalidade").value = item?.aluno || "";
  document.getElementById("campoValorMensalidade").value = item?.valor || "";
  document.getElementById("campoPagamentoMensalidade").value = item?.pagamento || "";
  document.getElementById("campoVencimentoMensalidade").value = item?.vencimento || "";
  document.getElementById("campoContatoMensalidade").value = (item?.contato || []).join(", ");
  document.getElementById("campoResponsavelMensalidade").value = item?.responsavel || "";
  document.getElementById("nomeAlunoModalInfo").textContent = item?.aluno || "Novo cadastro";
  document.getElementById("responsavelModalInfo").textContent = item?.responsavel || "Responsavel";
}

function abrirModalNova() {
  idEditando = null;
  document.getElementById("tituloModalMensalidade").textContent = "Nova mensalidade";
  botaoSalvar.textContent = "Cadastrar";
  preencherDadosModal(null);
  fundoModal.classList.add("ativo");
}

function abrirModalEditar(id) {
  const item = mensalidades.find((m) => m.id === Number(id));
  if (!item) return;
  idEditando = item.id;
  document.getElementById("tituloModalMensalidade").textContent = "Editar mensalidade";
  botaoSalvar.textContent = "Editar";
  preencherDadosModal(item);
  fundoModal.classList.add("ativo");
}

function fecharModal() {
  fundoModal.classList.remove("ativo");
}

function idAlunoPorNome(nomeAluno) {
  const aluno = alunos.find((item) => item.nome?.trim().toLowerCase() === nomeAluno.trim().toLowerCase());
  return aluno?.id_aluno || null;
}

async function salvarMensalidade() {
  const nomeAluno = document.getElementById("campoAlunoMensalidade").value.trim();
  const valor = Number(document.getElementById("campoValorMensalidade").value || 0);
  const pagamento = document.getElementById("campoPagamentoMensalidade").value;
  const vencimento = document.getElementById("campoVencimentoMensalidade").value;
  const idAluno = idAlunoPorNome(nomeAluno);
  const mensalidadeEditando = mensalidades.find((item) => item.id === idEditando);
  const idAlunoFinal = idAluno || mensalidadeEditando?.idAluno || null;

  if (!nomeAluno || !valor || !vencimento || !idAlunoFinal) {
          showWarning("Preencha os campos obrigatórios. O nome do aluno deve existir no cadastro.");
          return;
  }

  const payload = {
    id_aluno: idAlunoFinal,
    valor,
    data_vencimento: vencimento,
    data_pagamento: pagamento || null,
    status: pagamento ? "PAGO" : "PENDENTE",
  };

  if (idEditando) await window.API.put(`/mensalidades/${idEditando}`, payload);
  else await window.API.post("/mensalidades", payload);

  await carregarDados();
  renderizarTabela();
  atualizarResumo();
  fecharModal();
}

botaoNova.addEventListener("click", abrirModalNova);
botaoCancelar.addEventListener("click", fecharModal);
if (botaoFecharTopo) {
  botaoFecharTopo.addEventListener("click", fecharModal);
}
botaoSalvar.addEventListener("click", async () => {
  try {
    await salvarMensalidade();
  } catch (error) {
    console.error(error);
    showError("Não foi possível salvar a mensalidade.");
  }
});
campoBusca.addEventListener("input", renderizarTabela);

fundoModal.addEventListener("click", (event) => {
  if (event.target === fundoModal) fecharModal();
});

linhasTabela.addEventListener("click", async (event) => {
  const botao = event.target.closest("[data-acao]");
  if (!botao) return;
  const id = botao.dataset.id;
  const acao = botao.dataset.acao;
  try {
    if (acao === "editar") return abrirModalEditar(id);
    if (acao === "pagar") await window.API.put(`/mensalidades/${id}/pagar`, {});
    if (acao === "excluir") await window.API.del(`/mensalidades/${id}`);
    await carregarDados();
    renderizarTabela();
    atualizarResumo();
  } catch (error) {
    console.error(error);
    showError("Falha ao executar acao da mensalidade.");
  }
});


function carregarNovoAlunoDaTelaAlunos() {
  const params = new URLSearchParams(window.location.search);
  const veioDeAluno = params.get("novoAluno") === "1";

  if (!veioDeAluno) return;

  const dadosSalvos = localStorage.getItem("novoAlunoMensalidade");

  if (!dadosSalvos) return;

  const dados = JSON.parse(dadosSalvos);

  idEditando = null;

  document.getElementById("tituloModalMensalidade").textContent = "Nova mensalidade";
  botaoSalvar.textContent = "Cadastrar";

  document.getElementById("campoIdMensalidade").value = "";
  document.getElementById("campoAlunoMensalidade").value = dados.aluno || "";
  document.getElementById("campoResponsavelMensalidade").value = dados.responsavel || "";
  document.getElementById("campoContatoMensalidade").value = dados.contato || "";
  document.getElementById("campoValorMensalidade").value = "";
  document.getElementById("campoPagamentoMensalidade").value = "";
  document.getElementById("campoVencimentoMensalidade").value = "";

  document.getElementById("nomeAlunoModalInfo").textContent = dados.aluno || "Novo cadastro";
  document.getElementById("responsavelModalInfo").textContent = dados.responsavel || "Responsável";

  fundoModal.classList.add("ativo");

  localStorage.removeItem("novoAlunoMensalidade");

  window.history.replaceState({}, document.title, "mensalidade.html");
}

window.addEventListener("DOMContentLoaded", async () => {
  initMenu();
  configurarPreviewFotoMensalidade();

  try {
    await carregarDados();

    carregarNovoAlunoDaTelaAlunos();

    renderizarTabela();
    atualizarResumo();
  } catch (error) {
    console.error(error);
    showError("Não foi possível carregar as mensalidades.");
  }
});