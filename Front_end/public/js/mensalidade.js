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

/* =========================================================
   VARIÁVEIS GLOBAIS
   ========================================================= */

let mensalidades = [];
let alunos = [];
let idEditando = null;

/* =========================================================
   ELEMENTOS DOM
   ========================================================= */

const botaoNova = document.getElementById("botaoNovaMensalidade");
const fundoModal = document.getElementById("fundoModalMensalidade");
const botaoCancelar = document.getElementById("botaoCancelarMensalidade");
const botaoSalvar = document.getElementById("botaoSalvarMensalidade");
const campoBusca = document.getElementById("campoBuscaMensalidade");
const linhasTabela = document.getElementById("linhasMensalidades");
const filtroVencimento = document.getElementById("filtroVencimentoMensalidade");
const filtroOrdem = document.getElementById("filtroOrdemMensalidade");
const filtroEscola = document.getElementById("filtroEscolaMensalidade");
const btnLimparFiltros = document.getElementById("btnLimparFiltrosMensalidade");
const botaoFiltroMensalidade = document.getElementById("botaoFiltroMensalidade");
const painelFiltrosMensalidade = document.getElementById("painelFiltrosMensalidade");
const fotoMensalidade = document.getElementById("fotoMensalidade");
const previewFotoMensalidade = document.getElementById("previewFotoMensalidade");
const botaoFecharTopo = document.getElementById("btnFecharModalMensalidade");

/* =========================================================
   FUNÇÕES AUXILIARES
   ========================================================= */

function formatarBRL(valor) {
  return "R$ " + Number(valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarData(data) {
  if (!data) return "—";
  const valor = String(data).slice(0, 10).split("-");
  return `${valor[2]}/${valor[1]}/${valor[0]}`;
}

function statusPorDatas(pagamento, vencimento) {
  if (pagamento) return "pago";
  const hoje = new Date();
  const dataVencimento = new Date(vencimento + "T00:00:00");
  return dataVencimento < hoje ? "atrasado" : "pendente";
}

function badgeStatus(status) {
  if (status === "pago") return `<span class="status-badge status-pago">✔</span>`;
  if (status === "atrasado") return `<span class="status-badge status-atrasado">⚠</span>`;
  return `<span class="status-badge status-pendente">◌</span>`;
}

/* =========================================================
   INICIALIZAÇÃO DO MENU
   ========================================================= */

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

/* =========================================================
   PREVIEW FOTO
   ========================================================= */

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

/* =========================================================
   MAPEAMENTO E CARREGAMENTO DE DADOS (API)
   ========================================================= */

function mapearMensalidade(item) {
  return {
    id: item.id_mensalidade,
    idAluno: item.id_aluno,
    aluno: item.aluno?.nome || `Aluno #${item.id_aluno}`,
    responsavel: item.aluno?.responsavel?.nome || "Responsável não informado",
    valor: Number(item.valor || 0),
    vencimento: String(item.data_vencimento || "").slice(0, 10),
    pagamento: item.data_pagamento ? String(item.data_pagamento).slice(0, 10) : "",
    status: (item.status || "PENDENTE").toLowerCase(),
    contato: [item.aluno?.responsavel?.telefone].filter(Boolean),
    escola: item.aluno?.escola || "",
    foto: item.aluno?.foto ? `http://localhost:3000${item.aluno.foto}` : "",
  };
}

async function carregarDados() {
  try {
    const [respMensalidades, respAlunos] = await Promise.all([
      window.API.get("/mensalidades"),
      window.API.get("/alunos")
    ]);
    mensalidades = (respMensalidades || []).map(mapearMensalidade);
    alunos = respAlunos || [];
  } catch (error) {
    console.error(error);
    showError("Não foi possível carregar os dados.");
  }
}

/* =========================================================
   FILTROS
   ========================================================= */

function configurarFiltros() {
  if (!botaoFiltroMensalidade || !painelFiltrosMensalidade) return;

  botaoFiltroMensalidade.addEventListener("click", () => {
    painelFiltrosMensalidade.classList.toggle("hidden");
    botaoFiltroMensalidade.classList.toggle("aberto");
  });

  if (filtroVencimento) filtroVencimento.addEventListener("change", renderizarTabela);
  if (filtroOrdem) filtroOrdem.addEventListener("change", renderizarTabela);
  if (filtroEscola) filtroEscola.addEventListener("change", renderizarTabela);
  if (campoBusca) campoBusca.addEventListener("input", renderizarTabela);

  if (btnLimparFiltros) {
    btnLimparFiltros.addEventListener("click", () => {
      if (filtroVencimento) filtroVencimento.value = "";
      if (filtroOrdem) filtroOrdem.value = "alfabetica";
      if (filtroEscola) filtroEscola.value = "";
      renderizarTabela();
    });
  }
}

function atualizarOpcoesEscola() {
  if (!filtroEscola) return;

  const escolas = [...new Set(mensalidades.map((m) => m.escola).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  filtroEscola.innerHTML = `
    <option value="">Todas as escolas</option>
    ${escolas.map((escola) => `<option value="${escola}">${escola}</option>`).join("")}
  `;
}

/* =========================================================
   RENDERIZAÇÃO DA TABELA
   ========================================================= */

function renderizarTabela() {
  const busca = campoBusca ? campoBusca.value.toLowerCase().trim() : "";
  const venc = filtroVencimento ? filtroVencimento.value : "";
  const escola = filtroEscola ? filtroEscola.value : "";
  const ordem = filtroOrdem ? filtroOrdem.value : "alfabetica";

  let listaFiltrada = mensalidades.filter((item) => {
    const matchBusca = item.aluno.toLowerCase().includes(busca);
    const matchVenc = !venc || item.vencimento === venc;
    const matchEscola = !escola || item.escola === escola;
    return matchBusca && matchVenc && matchEscola;
  });

  if (ordem === "vencimento") {
    listaFiltrada.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  } else {
    listaFiltrada.sort((a, b) => a.aluno.localeCompare(b.aluno, "pt-BR"));
  }

  const tabela = document.getElementById("tabelaMensalidades");
  const avisoVazio = document.getElementById("avisoVazioMensalidade");

  if (!listaFiltrada.length) {
    if (linhasTabela) linhasTabela.innerHTML = "";
    if (tabela) tabela.style.display = "none";
    if (avisoVazio) avisoVazio.style.display = "block";
    return;
  }

  if (tabela) tabela.style.display = "table";
  if (avisoVazio) avisoVazio.style.display = "none";
  if (!linhasTabela) return;

  linhasTabela.innerHTML = listaFiltrada
    .map(
      (item) => `
    <tr>
      <td>
        <div class="celula-aluno">
          <div class="avatar-tabela">
            ${item.foto ? `<img src="${item.foto}" class="foto-tabela" alt="Foto de ${item.aluno}">` : ""}
          </div>
          <div class="nome-aluno">${item.aluno}</div>
        </div>
      </td>
      <td>${item.escola || "-"}</td>
      <td>${formatarBRL(item.valor)}</td>
      <td>${formatarData(item.vencimento)}</td>
      <td>${badgeStatus(item.status)}</td>
      <td>${formatarData(item.pagamento)}</td>
      <td>
        <div class="lista-contatos">
          ${item.contato.map((fone) => `<span>${fone}</span>`).join("")}
        </div>
      </td>
      <td>
        <div class="area-acoes">
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
        </div>
      </td>
    </table>
    `
    )
    .join("");
}

/* =========================================================
   RESUMO
   ========================================================= */

function atualizarResumo() {
  const total = mensalidades.reduce((acc, x) => acc + x.valor, 0);
  const pago = mensalidades.filter((x) => x.status === "pago").length;
  const atrasadas = mensalidades.filter((x) => x.status === "atrasado").length;
  const pendentes = mensalidades.filter((x) => x.status === "pendente").length;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };

  setText("resumoTotal", formatarBRL(total));
  setText("resumoPago", pago);
  setText("resumoAtrasadas", atrasadas);
  setText("resumoPendentes", pendentes);
}

/* =========================================================
   MODAL - CRUD
   ========================================================= */

function preencherDadosModal(item) {
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  setValue("campoIdMensalidade", item?.id);
  setValue("campoAlunoMensalidade", item?.aluno);
  setValue("campoValorMensalidade", item?.valor);
  setValue("campoPagamentoMensalidade", item?.pagamento);
  setValue("campoVencimentoMensalidade", item?.vencimento);
  setValue("campoContatoMensalidade", (item?.contato || []).join(", "));
  setValue("campoResponsavelMensalidade", item?.responsavel);
  setValue("campoEscolaMensalidade", item?.escola);

  const nomeAlunoSpan = document.getElementById("nomeAlunoModalInfo");
  const responsavelSpan = document.getElementById("responsavelModalInfo");

  if (nomeAlunoSpan) nomeAlunoSpan.textContent = item?.aluno || "Novo cadastro";
  if (responsavelSpan) responsavelSpan.textContent = item?.responsavel || "Responsável";
}

function abrirModalNova() {
  idEditando = null;
  const titulo = document.getElementById("tituloModalMensalidade");
  if (titulo) titulo.textContent = "Nova mensalidade";
  if (botaoSalvar) botaoSalvar.textContent = "Cadastrar";
  preencherDadosModal(null);
  if (fundoModal) fundoModal.classList.add("ativo");

  // Limpar preview da foto
  if (previewFotoMensalidade) {
    previewFotoMensalidade.src = "";
    previewFotoMensalidade.style.display = "none";
  }
  const placeholder = document.getElementById("avatarPlaceholderMensalidade");
  const avatar = document.getElementById("avatarModalMensalidade");
  if (placeholder) placeholder.style.display = "block";
  if (avatar) avatar.classList.remove("com-foto");
}

function abrirModalEditar(id) {
  const item = mensalidades.find((m) => m.id === Number(id));
  if (!item) return;

  idEditando = item.id;
  const titulo = document.getElementById("tituloModalMensalidade");
  if (titulo) titulo.textContent = "Editar mensalidade";
  if (botaoSalvar) botaoSalvar.textContent = "Editar";
  preencherDadosModal(item);
  if (fundoModal) fundoModal.classList.add("ativo");

  // Mostrar preview da foto se existir
  if (item.foto && previewFotoMensalidade) {
    previewFotoMensalidade.src = item.foto;
    previewFotoMensalidade.style.display = "block";
    const placeholder = document.getElementById("avatarPlaceholderMensalidade");
    const avatar = document.getElementById("avatarModalMensalidade");
    if (placeholder) placeholder.style.display = "none";
    if (avatar) avatar.classList.add("com-foto");
  }
}

function fecharModal() {
  if (fundoModal) fundoModal.classList.remove("ativo");
}

function idAlunoPorNome(nomeAluno) {
  const aluno = alunos.find(
    (item) => item.nome?.trim().toLowerCase() === nomeAluno.trim().toLowerCase()
  );
  return aluno?.id_aluno || null;
}

async function salvarMensalidade() {
  const nomeAluno = document.getElementById("campoAlunoMensalidade")?.value.trim() || "";
  const valor = Number(document.getElementById("campoValorMensalidade")?.value || 0);
  const pagamento = document.getElementById("campoPagamentoMensalidade")?.value || "";
  const vencimento = document.getElementById("campoVencimentoMensalidade")?.value || "";
  const mensalidadeEditando = mensalidades.find((item) => item.id === idEditando);
  const idAlunoFinal = idAlunoPorNome(nomeAluno) || mensalidadeEditando?.idAluno || null;

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

  try {
    if (idEditando) {
      await window.API.put(`/mensalidades/${idEditando}`, payload);
      await showSuccess("Mensalidade atualizada com sucesso!");
    } else {
      await window.API.post("/mensalidades", payload);
      await showSuccess("Mensalidade cadastrada com sucesso!");
    }

    await carregarDados();
    atualizarOpcoesEscola();
    renderizarTabela();
    atualizarResumo();
    fecharModal();
  } catch (error) {
    console.error(error);
    showError("Não foi possível salvar a mensalidade.");
  }
}

/* =========================================================
   EVENTOS DA TABELA (Editar/Pagar/Excluir)
   ========================================================= */

function configurarEventosTabela() {
  if (!linhasTabela) return;

  linhasTabela.addEventListener("click", async (event) => {
    const botao = event.target.closest("[data-acao]");
    if (!botao) return;

    const id = botao.dataset.id;
    const acao = botao.dataset.acao;

    try {
      if (acao === "editar") {
        abrirModalEditar(id);
        return;
      }

      if (acao === "pagar") {
        const confirm = await showConfirm("Deseja marcar esta mensalidade como paga?");
        if (!confirm.isConfirmed) return;
        await window.API.put(`/mensalidades/${id}/pagar`, {});
        await showSuccess("Mensalidade marcada como paga!");
      }

      if (acao === "excluir") {
        const confirm = await showConfirm("Tem certeza que deseja excluir esta mensalidade?");
        if (!confirm.isConfirmed) return;
        await window.API.del(`/mensalidades/${id}`);
        await showSuccess("Mensalidade excluída com sucesso!");
      }

      await carregarDados();
      atualizarOpcoesEscola();
      renderizarTabela();
      atualizarResumo();
    } catch (error) {
      console.error(error);
      showError("Falha ao executar ação da mensalidade.");
    }
  });
}

/* =========================================================
   NOVO ALUNO VINDO DA TELA DE ALUNOS
   ========================================================= */

function carregarNovoAlunoDaTelaAlunos() {
  const params = new URLSearchParams(window.location.search);
  const veioDeAluno = params.get("novoAluno") === "1";

  if (!veioDeAluno) return;

  const dadosSalvos = localStorage.getItem("novoAlunoMensalidade");
  if (!dadosSalvos) return;

  const dados = JSON.parse(dadosSalvos);

  idEditando = null;

  const titulo = document.getElementById("tituloModalMensalidade");
  if (titulo) titulo.textContent = "Nova mensalidade";
  if (botaoSalvar) botaoSalvar.textContent = "Cadastrar";

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  setValue("campoIdMensalidade", "");
  setValue("campoAlunoMensalidade", dados.aluno || "");
  setValue("campoResponsavelMensalidade", dados.responsavel || "");
  setValue("campoContatoMensalidade", dados.contato || "");
  setValue("campoEscolaMensalidade", dados.escola || "");
  setValue("campoValorMensalidade", "");
  setValue("campoPagamentoMensalidade", "");
  setValue("campoVencimentoMensalidade", "");

  const nomeAlunoSpan = document.getElementById("nomeAlunoModalInfo");
  const responsavelSpan = document.getElementById("responsavelModalInfo");

  if (nomeAlunoSpan) nomeAlunoSpan.textContent = dados.aluno || "Novo cadastro";
  if (responsavelSpan) responsavelSpan.textContent = dados.responsavel || "Responsável";

  if (fundoModal) fundoModal.classList.add("ativo");

  localStorage.removeItem("novoAlunoMensalidade");
  window.history.replaceState({}, document.title, "mensalidade.html");
}

/* =========================================================
   EVENTOS DOS BOTÕES
   ========================================================= */

function configurarBotoes() {
  if (botaoNova) botaoNova.addEventListener("click", abrirModalNova);
  if (botaoCancelar) botaoCancelar.addEventListener("click", fecharModal);
  if (botaoFecharTopo) botaoFecharTopo.addEventListener("click", fecharModal);
  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", async () => {
      await salvarMensalidade();
    });
  }

  if (fundoModal) {
    fundoModal.addEventListener("click", (event) => {
      if (event.target === fundoModal) fecharModal();
    });
  }
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

window.addEventListener("DOMContentLoaded", async () => {
  initMenu();
  configurarPreviewFotoMensalidade();
  configurarFiltros();

  try {
    await carregarDados();
    atualizarOpcoesEscola();
    renderizarTabela();
    atualizarResumo();
    configurarBotoes();
    configurarEventosTabela();
    carregarNovoAlunoDaTelaAlunos();
  } catch (error) {
    console.error(error);
    showError("Não foi possível carregar as mensalidades.");
  }
});