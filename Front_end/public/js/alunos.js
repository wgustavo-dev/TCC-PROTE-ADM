let alunos = [];
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
    alert("Nao foi possivel carregar os alunos.");
    return [];
  }
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
    embarque: el.enderecoEmbarque.value.trim(),
    desembarque: el.enderecoDesembarque.value.trim(),
  };
}

async function salvarAluno(payload) {
  const form = new FormData();
  form.append("nome", payload.nome);
  form.append("endereco_embarque", payload.embarque);
  form.append("endereco_desembarque", payload.desembarque);
  if (payload.id) form.append("id_aluno", payload.id);
  if (el.fotoAluno.files[0]) form.append("foto", el.fotoAluno.files[0]);

  if (payload.id) {
    await window.API.put(`/alunos/${payload.id}`, {
      nome: payload.nome,
      endereco_embarque: payload.embarque,
      endereco_desembarque: payload.desembarque,
    });
    return;
  }

  await window.API.post("/alunos", form);
}

function configurarFormulario() {
  el.formAluno.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = montarPayloadAluno();
    if (!payload.nome || !payload.responsavel1 || !payload.telefone1 || !payload.embarque || !payload.desembarque) {
      alert("Preencha os campos obrigatorios.");
      return;
    }

    try {
      await salvarAluno(payload);
      alunos = await carregarAlunos();
      fecharModal();
      renderizar();
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel salvar o aluno.");
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

    if (botao.dataset.action === "editar") return abrirModalEditar(aluno);
    if (botao.dataset.action !== "excluir") return;

    if (!confirm("Tem certeza que deseja excluir este aluno?")) return;

    try {
      await window.API.del(`/alunos/${id}`);
      alunos = alunos.filter((item) => String(item.id) !== String(id));
      renderizar();
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel excluir o aluno.");
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
  esconderPreviewFoto();
  el.modalOverlay.classList.remove("hidden");
}

function abrirModalEditar(aluno) {
  el.modalTitulo.textContent = "Editar aluno";
  el.alunoId.value = aluno.id || "";
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
  configurarModal();
  configurarBusca();
  configurarMascaras();
  configurarPreviewFoto();
  configurarFormulario();
  configurarTabela();
  renderizar();
});
