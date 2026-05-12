/* =========================================================
   ALERTAS PERSONALIZADOS - SWEETALERT2
   Esses alerts substituem o alert() normal do navegador
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
   VARIÁVEIS GLOBAIS DA TELA DE ALUNOS
   ========================================================= */

let alunos = [];
let responsaveis = [];
let el = null;

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

function toUrlFoto(pathFoto) {
  if (!pathFoto) return "";
  if (pathFoto.startsWith("http")) return pathFoto;
  return `http://localhost:3000${pathFoto}`;
}

function mapearAlunoApi(item) {
  return {
    id: item.id_aluno,
    nome: item.nome || "",
    responsavel1: item.responsavel?.nome || "",
    telefone1: item.responsavel?.telefone || "",
    responsavel2: "",
    telefone2: "",
    embarque: item.endereco_embarque || "",
    desembarque: item.endereco_desembarque || "",
    foto: toUrlFoto(item.foto),
  };
}

async function carregarAlunos() {
  try {
    const data = await window.API.get("/alunos");
    return Array.isArray(data) ? data.map(mapearAlunoApi) : [];
  } catch (error) {
    console.error(error);
   showError("Não foi possível carregar os alunos.");
    return [];
  }
}

async function carregarResponsaveis() {
  try {
    const data = await window.API.get("/responsaveis");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);
   showError("Não foi possível carregar os responsáveis.");
    return [];
  }
}

function encontrarResponsavelPorNome(nome) {
  const nomeNormalizado = (nome || "").trim().toLowerCase();
  if (!nomeNormalizado) return null;
  return responsaveis.find((item) => (item.nome || "").trim().toLowerCase() === nomeNormalizado) || null;
}

function configurarModal() {
  if (!el.btnAbrirModal) return;

  el.btnAbrirModal.addEventListener("click", abrirModalNovo);
  el.btnFecharModal.addEventListener("click", fecharModal);
  el.btnCancelar.addEventListener("click", fecharModal);
  el.modalOverlay.addEventListener("click", (event) => {
    if (event.target === el.modalOverlay) fecharModal();
  });
}

function configurarBusca() {
  el.inputBusca.addEventListener("input", renderizar);
}

function aplicarMascaraNome(valor) {
  return valor.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\s-]/g, "").replace(/\s{2,}/g, " ").slice(0, 80);
}

function aplicarMascaraTelefone(valor) {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function aplicarMascaraEndereco(valor) {
  return valor
    .replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ.,º°ª\-\/\s]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 140);
}

function configurarMascaras() {
  const camposNome = [el.nomeAluno, el.nomeResponsavel1, el.nomeResponsavel2];
  const camposTelefone = [el.telefoneResponsavel1, el.telefoneResponsavel2];
  const camposEndereco = [el.enderecoEmbarque, el.enderecoDesembarque];

  camposNome.forEach((campo) => campo && campo.addEventListener("input", () => (campo.value = aplicarMascaraNome(campo.value))));
  camposTelefone.forEach((campo) =>
    campo && campo.addEventListener("input", () => (campo.value = aplicarMascaraTelefone(campo.value)))
  );
  camposEndereco.forEach((campo) =>
    campo && campo.addEventListener("input", () => (campo.value = aplicarMascaraEndereco(campo.value)))
  );
}

function configurarAutocompletarResponsavel() {
  if (!el.nomeResponsavel1 || !el.telefoneResponsavel1) return;

  const sincronizar = () => {
    const responsavel = encontrarResponsavelPorNome(el.nomeResponsavel1.value);
    if (!responsavel) return;
    el.nomeResponsavel1.value = responsavel.nome || "";
    el.telefoneResponsavel1.value = aplicarMascaraTelefone(responsavel.telefone || "");
  };

  el.nomeResponsavel1.addEventListener("change", sincronizar);
  el.nomeResponsavel1.addEventListener("blur", sincronizar);
}

function configurarPreviewFoto() {
  if (!el.fotoAluno) return;
  el.fotoAluno.addEventListener("change", () => {
    const arquivo = el.fotoAluno.files[0];
    if (!arquivo) return esconderPreviewFoto();
    const leitor = new FileReader();
    leitor.onload = (evento) => mostrarPreviewFoto(evento.target.result);
    leitor.readAsDataURL(arquivo);
  });
}

function montarPayloadAluno() {
  return {
    id: el.alunoId.value || null,
    nome: el.nomeAluno.value.trim(),
    responsavel1: el.nomeResponsavel1.value.trim(),
    telefone1: el.telefoneResponsavel1.value.trim(),
    responsavel2: el.nomeResponsavel2 ? el.nomeResponsavel2.value.trim() : "",
    telefone2: el.telefoneResponsavel2 ? el.telefoneResponsavel2.value.trim() : "",
    embarque: el.enderecoEmbarque.value.trim(),
    desembarque: el.enderecoDesembarque.value.trim(),

    // Campos visuais do formulário antigo
    escola: el.escolaAluno ? el.escolaAluno.value.trim() : "",
    vencimento: el.vencimentoAluno ? el.vencimentoAluno.value : "",
    tipoTrajeto: el.tipoTrajetoAluno ? el.tipoTrajetoAluno.value : "",
    periodo: el.periodoAluno ? el.periodoAluno.value : "",
    horarioTurma: el.horarioTurmaAluno ? el.horarioTurmaAluno.value : ""
  };
}

async function salvarAluno(payload) {
  const form = new FormData();
  form.append("nome", payload.nome);
  form.append("endereco_embarque", payload.embarque);
  form.append("endereco_desembarque", payload.desembarque);
  form.append("responsavel_nome", payload.responsavel1);
  form.append("responsavel_telefone", payload.telefone1);
  if (el.fotoAluno.files[0]) form.append("foto", el.fotoAluno.files[0]);

  if (payload.id) {
    await window.API.put(`/alunos/${payload.id}`, form);
    return;
  }

  await window.API.post("/alunos", form);
}

function configurarFormulario() {
  el.formAluno.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = montarPayloadAluno();
    const responsavelSelecionado = encontrarResponsavelPorNome(payload.responsavel1);

    if (!payload.nome || !payload.responsavel1 || !payload.embarque || !payload.desembarque) {
      showWarning("Preencha os campos obrigatórios.");
      return;
    }

    if (!responsavelSelecionado) {
      showWarning("Responsável não cadastrado.");
      return;
    }

    payload.responsavel1 = responsavelSelecionado.nome || payload.responsavel1;
    payload.telefone1 = aplicarMascaraTelefone(responsavelSelecionado.telefone || "");
    el.telefoneResponsavel1.value = payload.telefone1;

   try {
  const novoCadastro = !payload.id;

  await salvarAluno(payload);

  alunos = await carregarAlunos();

  fecharModal();
  renderizar();

  await showSuccess(payload.id ? "Aluno atualizado com sucesso!" : "Aluno cadastrado com sucesso!");

  if (novoCadastro) {
    localStorage.setItem(
      "novoAlunoMensalidade",
      JSON.stringify({
        aluno: payload.nome,
        responsavel: payload.responsavel1,
        contato: payload.telefone1,
        escola: payload.escola || ""
      })
    );

    window.location.href = "mensalidade.html?novoAluno=1";
  }
  } catch (error) {
    console.error(error);
    showError("Não foi possível salvar o aluno.");
  }
  });
}

function configurarTabela() {
  el.tbodyAlunos.addEventListener("click", async (event) => {
    const botao = event.target.closest("button[data-action]");

    if (!botao) return;

    const id = botao.dataset.id;
    const aluno = alunos.find((item) => String(item.id) === String(id));

    if (!aluno) return;

    if (botao.dataset.action === "editar") {
      return abrirModalEditar(aluno);
    }

    if (botao.dataset.action !== "excluir") return;

    const resposta = await showConfirm("Tem certeza que deseja excluir este aluno?");

    if (!resposta.isConfirmed) return;

    try {
      await window.API.del(`/alunos/${id}`);

      alunos = alunos.filter((item) => String(item.id) !== String(id));

      renderizar();

      showSuccess("Aluno excluído com sucesso!");
    } catch (error) {
      console.error(error);
      showError("Não foi possível excluir o aluno.");
    }
  });
}

function obterAlunosFiltrados() {
  const busca = el.inputBusca.value.trim().toLowerCase();
  return alunos.filter((aluno) => {
    const texto = [aluno.nome, aluno.responsavel1, aluno.telefone1, aluno.embarque, aluno.desembarque]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !busca || texto.includes(busca);
  });
}

function renderizar() {
  const lista = obterAlunosFiltrados();
  if (!lista.length) {
    el.tbodyAlunos.innerHTML = "";
    el.emptyState.style.display = "block";
    return;
  }

  el.emptyState.style.display = "none";
  el.tbodyAlunos.innerHTML = lista
    .map(
      (aluno) => `
    <tr>
      <td><div class="celula-aluno">${aluno.foto ? `<img src="${aluno.foto}" alt="Foto de ${aluno.nome}" class="foto-aluno">` : `<div class="foto-placeholder">SEM FOTO</div>`}</div></td>
      <td><span class="nome-aluno">${aluno.nome || "-"}</span></td>
      <td><span class="linha-texto">${aluno.responsavel1 || "-"}</span></td>
      <td><span class="linha-texto">${aluno.telefone1 || "-"}</span></td>
      <td>${aluno.embarque || "-"}</td>
      <td>${aluno.desembarque || "-"}</td>
      <td>
        <div class="actions">
          <button class="icon-btn edit" data-id="${aluno.id}" data-action="editar" aria-label="Editar aluno">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
            </svg>
          </button>
          <button class="icon-btn delete" data-id="${aluno.id}" data-action="excluir" aria-label="Excluir aluno">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14H6L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
              <path d="M9 6V4h6v2"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>`
    )
    .join("");
}

function obterElementos() {
  return {
    btnAbrirModal: document.getElementById("btnAbrirModal"),
    btnFecharModal: document.getElementById("btnFecharModal"),
    btnCancelar: document.getElementById("btnCancelar"),
    modalOverlay: document.getElementById("modalOverlay"),
    formAluno: document.getElementById("formAluno"),
    alunoId: document.getElementById("alunoId"),
    nomeAluno: document.getElementById("nomeAluno"),
    nomeResponsavel1: document.getElementById("nomeResponsavel1"),
    telefoneResponsavel1: document.getElementById("telefoneResponsavel1"),
    nomeResponsavel2: document.getElementById("nomeResponsavel2"),
    telefoneResponsavel2: document.getElementById("telefoneResponsavel2"),
    enderecoEmbarque: document.getElementById("enderecoEmbarque"),
    enderecoDesembarque: document.getElementById("enderecoDesembarque"),
    fotoAluno: document.getElementById("fotoAluno"),
    previewFoto: document.getElementById("previewFoto"),
    avatarModalAluno: document.getElementById("avatarModalAluno"),
    escolaAluno: document.getElementById("escolaAluno"),
    vencimentoAluno: document.getElementById("vencimentoAluno"),
    tipoTrajetoAluno: document.getElementById("tipoTrajetoAluno"),
    periodoAluno: document.getElementById("periodoAluno"),
    horarioTurmaAluno: document.getElementById("horarioTurmaAluno"),
    inputBusca: document.getElementById("inputBusca"),
    tbodyAlunos: document.getElementById("tbodyAlunos"),
    emptyState: document.getElementById("emptyState"),
    modalTitulo: document.getElementById("modalTitulo"),
  };
}

function abrirModalNovo() {
  el.modalTitulo.textContent = "Novo aluno";
  el.formAluno.reset();
  el.alunoId.value = "";
  el.nomeResponsavel1.required = true;
  el.telefoneResponsavel1.required = false;
  esconderPreviewFoto();
  el.modalOverlay.classList.remove("hidden");
}

function abrirModalEditar(aluno) {
  el.modalTitulo.textContent = "Editar aluno";
  el.alunoId.value = aluno.id || "";
  el.nomeResponsavel1.required = true;
  el.telefoneResponsavel1.required = false;
  el.nomeAluno.value = aplicarMascaraNome(aluno.nome || "");
  el.nomeResponsavel1.value = aplicarMascaraNome(aluno.responsavel1 || "");
  el.telefoneResponsavel1.value = aplicarMascaraTelefone(aluno.telefone1 || "");
  el.enderecoEmbarque.value = aplicarMascaraEndereco(aluno.embarque || "");
  el.enderecoDesembarque.value = aplicarMascaraEndereco(aluno.desembarque || "");
  aluno.foto ? mostrarPreviewFoto(aluno.foto) : esconderPreviewFoto();
  el.modalOverlay.classList.remove("hidden");
}

function fecharModal() {
  el.modalOverlay.classList.add("hidden");
}

function mostrarPreviewFoto(src) {
  el.previewFoto.src = src;
  el.avatarModalAluno.classList.add("com-foto");
}

function esconderPreviewFoto() {
  el.previewFoto.src = "";
  el.avatarModalAluno.classList.remove("com-foto");
}

window.addEventListener("DOMContentLoaded", async () => {
  initMenu();
  el = obterElementos();
  if (!el || !el.formAluno) return;

  alunos = await carregarAlunos();
  responsaveis = await carregarResponsaveis();
  configurarModal();
  configurarBusca();
  configurarMascaras();
  configurarAutocompletarResponsavel();
  configurarPreviewFoto();
  configurarFormulario();
  configurarTabela();
  renderizar();
});
