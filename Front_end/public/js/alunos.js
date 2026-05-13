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

let alunos = [];
let responsaveis = [];
let el = null;

/* =========================================================
   FUNÇÕES AUXILIARES - API E MÁSCARAS
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
    escola: item.escola || "",
    vencimento: item.vencimento || "",
    tipoTrajeto: item.tipo_trajeto === "IDA" ? "ida" : item.tipo_trajeto === "VOLTA" ? "volta" : "ida_e_volta",
    periodo: item.turno ? item.turno.toLowerCase() : "manha",
    horarioTurma: item.horario_turma || ""
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
  
  if (el.linkFotoAluno) {
    el.linkFotoAluno.addEventListener("input", () => {
      const link = el.linkFotoAluno.value.trim();
      if (!link) return esconderPreviewFoto();
      mostrarPreviewFoto(link);
    });
  }
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
    escola: el.escolaAluno ? el.escolaAluno.value.trim() : "",
    vencimento: el.vencimentoAluno ? el.vencimentoAluno.value : "",
    tipoTrajeto: el.tipoTrajetoAluno ? el.tipoTrajetoAluno.value : "ida_e_volta",
    periodo: el.periodoAluno ? el.periodoAluno.value : "manha",
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
  form.append("escola", payload.escola);
  form.append("vencimento", payload.vencimento);
  const tipoTrajetoApi = payload.tipoTrajeto === "ida" ? "IDA" : payload.tipoTrajeto === "volta" ? "VOLTA" : "AMBOS";
  const turnoApi = payload.periodo ? payload.periodo.toUpperCase() : "MANHA";

  form.append("tipo_trajeto", tipoTrajetoApi);
  form.append("turno", turnoApi);
  form.append("horario_turma", payload.horarioTurma);
  
  if (el.fotoAluno.files[0]) form.append("foto", el.fotoAluno.files[0]);

  if (payload.id) {
    await window.API.put(`/alunos/${payload.id}`, form);
    return;
  }

  await window.API.post("/alunos", form);
}

/* =========================================================
   FUNÇÕES DE MODAL E FORMULÁRIO
   ========================================================= */

function configurarModal() {
  if (!el.btnAbrirModal) return;

  el.btnAbrirModal.addEventListener("click", abrirModalNovo);
  el.btnFecharModal.addEventListener("click", fecharModal);
  el.btnCancelar.addEventListener("click", fecharModal);
  el.modalOverlay.addEventListener("click", (event) => {
    if (event.target === el.modalOverlay) fecharModal();
  });
}

/* =========================================================
   FILTROS AVANÇADOS
   ========================================================= */

function configurarBuscaEFiltros() {
  if (el.botaoFiltroAluno) {
    el.botaoFiltroAluno.addEventListener("click", () => {
      el.painelFiltrosAluno.classList.toggle("hidden");
      el.botaoFiltroAluno.classList.toggle("aberto");
    });
  }

  if (el.inputBusca) {
    el.inputBusca.addEventListener("input", renderizar);
  }

  const filtros = [el.filtroOrdem, el.filtroEscola, el.filtroTrajeto, el.filtroVencimento];
  filtros.forEach((campo) => campo && campo.addEventListener("change", renderizar));

  if (el.btnLimparFiltros) {
    el.btnLimparFiltros.addEventListener("click", () => {
      if (el.filtroOrdem) el.filtroOrdem.value = "alfabetica";
      if (el.filtroEscola) el.filtroEscola.value = "";
      if (el.filtroTrajeto) el.filtroTrajeto.value = "";
      if (el.filtroVencimento) el.filtroVencimento.value = "";
      renderizar();
    });
  }
}

function atualizarOpcoesEscola() {
  if (!el.filtroEscola) return;
  
  const escolas = [...new Set(alunos.map((aluno) => aluno.escola).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  el.filtroEscola.innerHTML = `
    <option value="">Todas as escolas</option>
    ${escolas.map((escola) => `<option value="${escola}">${escola}</option>`).join("")}
  `;
}

function obterDescricaoTrajeto(tipo) {
  const trajetos = {
    ida: "Apenas ir",
    volta: "Apenas voltar",
    ida_e_volta: "Ir e voltar"
  };
  return trajetos[tipo] || "-";
}

function obterAlunosFiltrados() {
  const busca = el.inputBusca ? el.inputBusca.value.trim().toLowerCase() : "";
  const escola = el.filtroEscola ? el.filtroEscola.value : "";
  const trajeto = el.filtroTrajeto ? el.filtroTrajeto.value : "";
  const venc = el.filtroVencimento ? el.filtroVencimento.value : "";
  const ordem = el.filtroOrdem ? el.filtroOrdem.value : "alfabetica";

  let lista = alunos.filter((aluno) => {
    const textoBusca = [aluno.nome, aluno.responsavel1, aluno.responsavel2, aluno.escola, aluno.embarque, aluno.desembarque]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!busca || textoBusca.includes(busca)) &&
      (!escola || aluno.escola === escola) &&
      (!trajeto || aluno.tipoTrajeto === trajeto) &&
      (!venc || aluno.vencimento === venc)
    );
  });

  if (ordem === "vencimento") {
    lista.sort((a, b) => (a.vencimento || "").localeCompare(b.vencimento || ""));
  } else {
    lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  }

  return lista;
}

/* =========================================================
   RENDERIZAÇÃO DA TABELA
   ========================================================= */

function renderizarTabela(lista) {
  if (!el.tbodyAlunos) return;
  
  if (!lista.length) {
    el.tbodyAlunos.innerHTML = "";
    if (el.emptyState) el.emptyState.style.display = "block";
    return;
  }

  if (el.emptyState) el.emptyState.style.display = "none";
  
  el.tbodyAlunos.innerHTML = lista
    .map(
      (aluno) => `
    <tr>
      <td><div class="celula-aluno">${aluno.foto ? `<img src="${aluno.foto}" alt="Foto de ${aluno.nome}" class="foto-aluno">` : `<div class="foto-placeholder">SEM FOTO</div>`}</div></td>
      <td><span class="nome-aluno">${aluno.nome || "-"}</span></td>
      <td>${aluno.escola || "-"}</td>
      <td>${aluno.vencimento || "-"}</td>
      <td>${obterDescricaoTrajeto(aluno.tipoTrajeto)}</td>
      <td>
        <span class="linha-texto">${aluno.responsavel1 || "-"}</span>
        ${aluno.responsavel2 ? `<span class="linha-texto">${aluno.responsavel2}</span>` : ""}
        </td>
      <td>
        <span class="linha-texto">${aluno.telefone1 || "-"}</span>
        ${aluno.telefone2 ? `<span class="linha-texto">${aluno.telefone2}</span>` : ""}
        </td>
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
    </tr>
    `
    )
    .join("");
}

/* =========================================================
   RENDERIZAÇÃO DE ROTAS
   ========================================================= */

function renderizarRotas(lista) {
  if (!el.rotasContainer) return;
  
  const grupos = {};

  lista.forEach((a) => {
    const chave = `${a.periodo || "manha"}|${a.horarioTurma || "00:00"}`;
    grupos[chave] = grupos[chave] || [];
    grupos[chave].push(a);
  });

  const tituloPeriodo = {
    manha: "Turma da manhã",
    tarde: "Turma da tarde",
    noite: "Turma da noite"
  };

  const cards = Object.entries(grupos)
    .sort((x, y) => x[0].localeCompare(y[0]))
    .map(([chave, alunosGrupo]) => {
      const [periodo, horario] = chave.split("|");
      const itens = alunosGrupo
        .map(
          (a) => `
          <li>
            <strong>${a.nome}</strong> — ${a.escola}
            <br>
            <small>
              ${a.tipoTrajeto === "volta" ? "Desembarque" : "Embarque"}: ${a.embarque}
              ${a.tipoTrajeto === "ida" ? "" : ` | Desembarque: ${a.desembarque}`}
            </small>
          </li>
        `
        )
        .join("");
      return `
        <div class="rota-card">
          <h4>${tituloPeriodo[periodo] || "Turma"} — ${horario}</h4>
          <ul>${itens}</ul>
        </div>
      `;
    })
    .join("");

  el.rotasContainer.innerHTML = cards || '<div class="empty-state">Nenhuma rota montada.</div>';
}

/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================= */

function renderizar() {
  const lista = obterAlunosFiltrados();
  renderizarTabela(lista);
  renderizarRotas(lista);
}

/* =========================================================
   CRUD E CONFIGURAÇÕES DA TABELA - VERSÃO CORRIGIDA
   ========================================================= */

function configurarFormulario() {
  if (!el.formAluno) return;
  
  el.formAluno.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = montarPayloadAluno();
    
    // Verifica se o responsável 1 foi preenchido
    if (!payload.responsavel1 || payload.responsavel1.trim() === "") {
      showWarning("O campo 'Responsável 1' é obrigatório.");
      return;
    }

    // Validação dos campos obrigatórios do aluno
    if (!payload.nome || !payload.embarque || !payload.desembarque || !payload.escola || !payload.vencimento) {
      showWarning("Preencha todos os campos obrigatórios do aluno.");
      return;
    }

    // Validação de horário e período
    if (!payload.periodo || !payload.horarioTurma) {
      showWarning("Preencha o período e o horário da turma.");
      return;
    }

    // Verifica se o responsável existe, se não existir, sugere cadastrar
    const responsavelSelecionado = encontrarResponsavelPorNome(payload.responsavel1);
    
    if (!responsavelSelecionado) {
      const resposta = await Swal.fire({
        icon: "question",
        title: "Responsável não cadastrado",
        text: `"${payload.responsavel1}" não está cadastrado como responsável. Deseja cadastrá-lo agora?`,
        showCancelButton: true,
        confirmButtonText: "Sim, cadastrar",
        cancelButtonText: "Não, cancelar",
        customClass: {
          popup: "prote-alert",
          confirmButton: "prote-alert-button",
          cancelButton: "prote-alert-cancel-button"
        },
        buttonsStyling: false
      });

      if (resposta.isConfirmed) {
        localStorage.setItem("responsavelPendente", JSON.stringify({
          nome: payload.responsavel1,
          telefone: payload.telefone1 || "",
          email: "",
          voltarParaAluno: true,
          alunoData: payload
        }));
        window.location.href = "responsaveis.html?cadastrarResponsavel=1";
      }
      return;
    }

    // Responsável existe - prosseguir com cadastro
    payload.responsavel1 = responsavelSelecionado.nome || payload.responsavel1;
    payload.telefone1 = aplicarMascaraTelefone(responsavelSelecionado.telefone || "");
    if (el.telefoneResponsavel1) el.telefoneResponsavel1.value = payload.telefone1;

    try {
      const novoCadastro = !payload.id;
      await salvarAluno(payload);
      alunos = await carregarAlunos();
      fecharModal();
      atualizarOpcoesEscola();
      renderizar();
      
      await showSuccess(
        `${payload.id ? "Aluno atualizado" : "Aluno cadastrado"} com sucesso!\n\n` +
        `Nome: ${payload.nome}\n` +
        `Período: ${payload.periodo === "manha" ? "Manhã" : payload.periodo === "tarde" ? "Tarde" : "Noite"}\n` +
        `Horário: ${payload.horarioTurma}\n` +
        `Trajeto: ${payload.tipoTrajeto === "ida" ? "Apenas ida" : payload.tipoTrajeto === "volta" ? "Apenas volta" : "Ida e volta"}`
      );

      if (novoCadastro) {
        localStorage.setItem(
          "novoAlunoMensalidade",
          JSON.stringify({
            aluno: payload.nome,
            responsavel: payload.responsavel1,
            contato: payload.telefone1,
            escola: payload.escola || "",
            periodo: payload.periodo,
            horario: payload.horarioTurma,
            trajeto: payload.tipoTrajeto
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
  if (!el.tbodyAlunos) return;
  
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
      atualizarOpcoesEscola();
      renderizar();
      showSuccess("Aluno excluído com sucesso!");
    } catch (error) {
      console.error(error);
      showError("Não foi possível excluir o aluno.");
    }
  });
}

/* =========================================================
   ELEMENTOS DOM E MODAL
   ========================================================= */

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
    linkFotoAluno: document.getElementById("linkFotoAluno"),
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
    filtroOrdem: document.getElementById("filtroOrdemAluno"),
    filtroEscola: document.getElementById("filtroEscolaAluno"),
    filtroTrajeto: document.getElementById("filtroTrajetoAluno"),
    filtroVencimento: document.getElementById("filtroVencimentoAluno"),
    btnLimparFiltros: document.getElementById("btnLimparFiltrosAluno"),
    botaoFiltroAluno: document.getElementById("botaoFiltroAluno"),
    painelFiltrosAluno: document.getElementById("painelFiltrosAluno"),
    rotasContainer: document.getElementById("rotasContainer")
  };
}

function abrirModalNovo() {
  if (!el.modalTitulo) return;
  el.modalTitulo.textContent = "Novo aluno";
  if (el.formAluno) el.formAluno.reset();
  if (el.alunoId) el.alunoId.value = "";
  if (el.nomeResponsavel1) el.nomeResponsavel1.required = true;
  if (el.telefoneResponsavel1) el.telefoneResponsavel1.required = false;
  if (el.linkFotoAluno) el.linkFotoAluno.value = "";
  esconderPreviewFoto();
  if (el.modalOverlay) el.modalOverlay.classList.remove("hidden");
}

function abrirModalEditar(aluno) {
  if (!el.modalTitulo) return;
  el.modalTitulo.textContent = "Editar aluno";
  if (el.alunoId) el.alunoId.value = aluno.id || "";
  if (el.nomeAluno) el.nomeAluno.value = aplicarMascaraNome(aluno.nome || "");
  if (el.nomeResponsavel1) el.nomeResponsavel1.value = aplicarMascaraNome(aluno.responsavel1 || "");
  if (el.telefoneResponsavel1) el.telefoneResponsavel1.value = aplicarMascaraTelefone(aluno.telefone1 || "");
  if (el.enderecoEmbarque) el.enderecoEmbarque.value = aplicarMascaraEndereco(aluno.embarque || "");
  if (el.enderecoDesembarque) el.enderecoDesembarque.value = aplicarMascaraEndereco(aluno.desembarque || "");
  if (el.escolaAluno) el.escolaAluno.value = aluno.escola || "";
  if (el.vencimentoAluno) el.vencimentoAluno.value = aluno.vencimento || "";
  if (el.tipoTrajetoAluno) el.tipoTrajetoAluno.value = aluno.tipoTrajeto || "ida_e_volta";
  if (el.periodoAluno) el.periodoAluno.value = aluno.periodo || "manha";
  if (el.horarioTurmaAluno) el.horarioTurmaAluno.value = aluno.horarioTurma || "";
  if (el.linkFotoAluno) el.linkFotoAluno.value = "";
  aluno.foto ? mostrarPreviewFoto(aluno.foto) : esconderPreviewFoto();
  if (el.modalOverlay) el.modalOverlay.classList.remove("hidden");
}

function fecharModal() {
  if (el.modalOverlay) el.modalOverlay.classList.add("hidden");
}

function mostrarPreviewFoto(src) {
  if (el.previewFoto) {
    el.previewFoto.src = src;
    el.previewFoto.style.display = "block";
  }
  if (el.avatarModalAluno) el.avatarModalAluno.classList.add("com-foto");
  const placeholderIcon = document.getElementById("avatarPlaceholderIcon");
  if (placeholderIcon) placeholderIcon.style.display = "none";
}

function esconderPreviewFoto() {
  if (el.previewFoto) {
    el.previewFoto.src = "";
    el.previewFoto.style.display = "none";
  }
  if (el.avatarModalAluno) el.avatarModalAluno.classList.remove("com-foto");
  const placeholderIcon = document.getElementById("avatarPlaceholderIcon");
  if (placeholderIcon) placeholderIcon.style.display = "block";
}

function abrirCadastroAlunoVindoDeResponsavel() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("novoResponsavel")) return;

  const raw = localStorage.getItem("responsavelParaAluno");
  if (!raw) return;

  try {
    const responsavel = JSON.parse(raw);
    abrirModalNovo();
    if (el.nomeResponsavel1) el.nomeResponsavel1.value = aplicarMascaraNome(responsavel.nome || "");
    if (el.telefoneResponsavel1) el.telefoneResponsavel1.value = aplicarMascaraTelefone(responsavel.telefone || "");
    if (el.nomeAluno) el.nomeAluno.focus();
  } catch (error) {
    console.error(error);
  } finally {
    localStorage.removeItem("responsavelParaAluno");
    const limpa = new URL(window.location.href);
    limpa.searchParams.delete("novoResponsavel");
    window.history.replaceState({}, "", limpa.pathname + (limpa.search ? limpa.search : ""));
  }
}

function processarRetornoResponsavel() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("cadastrarResponsavel")) return;

  const raw = localStorage.getItem("responsavelPendente");
  if (!raw) return;

  try {
    const dados = JSON.parse(raw);
    if (dados.voltarParaAluno && dados.alunoData) {
      setTimeout(() => {
        if (el.nomeResponsavel1) el.nomeResponsavel1.value = dados.nome || "";
        if (el.telefoneResponsavel1) el.telefoneResponsavel1.value = dados.telefone || "";
        if (el.nomeAluno) el.nomeAluno.value = dados.alunoData.nome || "";
        if (el.enderecoEmbarque) el.enderecoEmbarque.value = dados.alunoData.embarque || "";
        if (el.enderecoDesembarque) el.enderecoDesembarque.value = dados.alunoData.desembarque || "";
        if (el.escolaAluno) el.escolaAluno.value = dados.alunoData.escola || "";
        if (el.vencimentoAluno) el.vencimentoAluno.value = dados.alunoData.vencimento || "";
        if (el.tipoTrajetoAluno) el.tipoTrajetoAluno.value = dados.alunoData.tipoTrajeto || "ida_e_volta";
        if (el.periodoAluno) el.periodoAluno.value = dados.alunoData.periodo || "manha";
        if (el.horarioTurmaAluno) el.horarioTurmaAluno.value = dados.alunoData.horarioTurma || "";
        
        showSuccess("Responsável cadastrado! Agora complete os dados do aluno.");
      }, 100);
    }
  } catch (error) {
    console.error(error);
  } finally {
    localStorage.removeItem("responsavelPendente");
    const limpa = new URL(window.location.href);
    limpa.searchParams.delete("cadastrarResponsavel");
    window.history.replaceState({}, "", limpa.pathname + (limpa.search ? limpa.search : ""));
  }
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

window.addEventListener("DOMContentLoaded", async () => {
  initMenu();
  el = obterElementos();
  if (!el || !el.formAluno) return;

  alunos = await carregarAlunos();
  responsaveis = await carregarResponsaveis();
  
  configurarModal();
  configurarBuscaEFiltros();
  configurarMascaras();
  configurarAutocompletarResponsavel();
  configurarPreviewFoto();
  configurarFormulario();
  configurarTabela();
  
  atualizarOpcoesEscola();
  renderizar();
  abrirCadastroAlunoVindoDeResponsavel();
  processarRetornoResponsavel();
});