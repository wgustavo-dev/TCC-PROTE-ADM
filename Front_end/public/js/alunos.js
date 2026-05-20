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

let fluxoCadastro = "normal";
let idOrcamentoFluxo = null;
let idResponsavelFluxo = null;
let alunoAtualFluxo = 1;
let totalAlunosFluxo = 1;
let responsavelFluxo = null;

/* =========================================================
   MENU
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
   FLUXO DE CADASTRO
   ========================================================= */

function lerParametrosFluxo() {
  const params = new URLSearchParams(window.location.search);

  fluxoCadastro = params.get("fluxo") || "normal";
  idOrcamentoFluxo = params.get("id_orcamento");
  idResponsavelFluxo = params.get("id_responsavel");
  alunoAtualFluxo = Number(params.get("alunoAtual") || 1);
  totalAlunosFluxo = Number(params.get("totalAlunos") || 1);

  /*
    Correção:
    Se existe id_responsavel na URL, o sistema deve considerar
    que está em fluxo guiado, mesmo se o fluxo vier ausente.
  */
  if (idResponsavelFluxo && !["orcamento", "manual"].includes(fluxoCadastro)) {
    fluxoCadastro = "manual";
  }

  if (!["orcamento", "manual"].includes(fluxoCadastro)) {
    fluxoCadastro = "normal";
  }

  if (!Number.isInteger(alunoAtualFluxo) || alunoAtualFluxo < 1) {
    alunoAtualFluxo = 1;
  }

  if (!Number.isInteger(totalAlunosFluxo) || totalAlunosFluxo < 1) {
    totalAlunosFluxo = 1;
  }
}

function estaEmFluxoGuiado() {
  const id = Number(idResponsavelFluxo);
  return Number.isInteger(id) && id > 0;
}

async function carregarResponsavelDoFluxo() {
  if (!estaEmFluxoGuiado()) return;

  try {
    responsavelFluxo = await window.API.get(`/responsaveis/${idResponsavelFluxo}`);
  } catch (error) {
    console.error("Erro ao carregar responsável do fluxo:", error);
    responsavelFluxo = null;
  }
}

function aplicarResponsavelDoFluxoNoFormulario() {
  if (!estaEmFluxoGuiado() || !responsavelFluxo) return;

  if (el.nomeResponsavel1) {
    el.nomeResponsavel1.value = aplicarMascaraNome(responsavelFluxo.nome || "");
    el.nomeResponsavel1.readOnly = true;
  }

  if (el.telefoneResponsavel1) {
    el.telefoneResponsavel1.value = aplicarMascaraTelefone(responsavelFluxo.telefone || "");
    el.telefoneResponsavel1.readOnly = true;
  }

  if (el.modalTitulo) {
    el.modalTitulo.textContent = `Novo aluno ${alunoAtualFluxo} de ${totalAlunosFluxo}`;
  }
}

function abrirFluxoGuiadoSeNecessario() {
  if (!estaEmFluxoGuiado()) return;

  abrirModalNovo();

  if (responsavelFluxo) {
    aplicarResponsavelDoFluxoNoFormulario();
  }

  if (el.modalTitulo) {
    el.modalTitulo.textContent = `Novo aluno ${alunoAtualFluxo} de ${totalAlunosFluxo}`;
  }

  if (el.modalOverlay) {
    el.modalOverlay.classList.remove("hidden");
  }

  if (el.nomeAluno) {
    setTimeout(() => {
      el.nomeAluno.focus();
    }, 100);
  }
}

function montarUrlMensalidade(idAluno) {
  const params = new URLSearchParams();

  params.set("fluxo", fluxoCadastro === "orcamento" ? "orcamento" : "manual");
  params.set("id_responsavel", String(idResponsavelFluxo));
  params.set("id_aluno", String(idAluno));
  params.set("alunoAtual", String(alunoAtualFluxo));
  params.set("totalAlunos", String(totalAlunosFluxo));

  if (fluxoCadastro === "orcamento" && idOrcamentoFluxo) {
    params.set("id_orcamento", String(idOrcamentoFluxo));
  }

  return `mensalidade.html?${params.toString()}`;
}

/* =========================================================
   FUNÇÕES AUXILIARES - API E MÁSCARAS
   ========================================================= */

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
    vencimento: "",
    tipoTrajeto: item.tipo_trajeto === "IDA" ? "ir" : item.tipo_trajeto === "VOLTA" ? "voltar" : "ambos",
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

function encontrarResponsavelPorId(idResponsavel) {
  const id = Number(idResponsavel);

  if (!Number.isInteger(id) || id <= 0) return null;

  return responsaveis.find((item) => Number(item.id_responsavel) === id) || null;
}

function encontrarResponsavelPorNome(nome) {
  const nomeNormalizado = (nome || "").trim().toLowerCase();

  if (!nomeNormalizado) return null;

  return responsaveis.find((item) => (item.nome || "").trim().toLowerCase() === nomeNormalizado) || null;
}

function aplicarMascaraNome(valor) {
  return String(valor || "")
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\s-]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 80);
}

function aplicarMascaraTelefone(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);

  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function aplicarMascaraEndereco(valor) {
  return String(valor || "")
    .replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ.,º°ª\-\/\s]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 140);
}

function configurarMascaras() {
  const camposNome = [el.nomeAluno, el.nomeResponsavel1, el.nomeResponsavel2];
  const camposTelefone = [el.telefoneResponsavel1, el.telefoneResponsavel2];
  const camposEndereco = [el.enderecoEmbarque, el.enderecoDesembarque];

  camposNome.forEach((campo) => {
    campo && campo.addEventListener("input", () => {
      campo.value = aplicarMascaraNome(campo.value);
    });
  });

  camposTelefone.forEach((campo) => {
    campo && campo.addEventListener("input", () => {
      campo.value = aplicarMascaraTelefone(campo.value);
    });
  });

  camposEndereco.forEach((campo) => {
    campo && campo.addEventListener("input", () => {
      campo.value = aplicarMascaraEndereco(campo.value);
    });
  });
}

function configurarAutocompletarResponsavel() {
  if (!el.nomeResponsavel1 || !el.telefoneResponsavel1) return;

  const sincronizar = () => {
    if (estaEmFluxoGuiado()) return;

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

/* =========================================================
   CAMPOS DINÂMICOS POR TRAJETO
   ========================================================= */

function atualizarCamposEnderecoPorTrajeto() {
  if (!el.tipoTrajetoAluno || !el.grupoEnderecoEmbarque || !el.grupoEnderecoDesembarque) return;

  const tipo = el.tipoTrajetoAluno.value;

  el.grupoEnderecoEmbarque.style.display = "none";
  el.grupoEnderecoDesembarque.style.display = "none";

  if (el.enderecoEmbarque) el.enderecoEmbarque.required = false;
  if (el.enderecoDesembarque) el.enderecoDesembarque.required = false;

  if (tipo === "ir") {
    el.grupoEnderecoEmbarque.style.display = "";
    if (el.enderecoEmbarque) el.enderecoEmbarque.required = true;
    if (el.enderecoDesembarque) el.enderecoDesembarque.value = "";
  }

  if (tipo === "voltar") {
    el.grupoEnderecoDesembarque.style.display = "";
    if (el.enderecoDesembarque) el.enderecoDesembarque.required = true;
    if (el.enderecoEmbarque) el.enderecoEmbarque.value = "";
  }

  if (tipo === "ambos") {
    el.grupoEnderecoEmbarque.style.display = "";
    el.grupoEnderecoDesembarque.style.display = "";
    if (el.enderecoEmbarque) el.enderecoEmbarque.required = true;
    if (el.enderecoDesembarque) el.enderecoDesembarque.required = true;
  }
}

/* =========================================================
   PAYLOAD
   ========================================================= */

function converterTrajetoParaApi(tipoTrajeto) {
  if (tipoTrajeto === "ir") return "IDA";
  if (tipoTrajeto === "voltar") return "VOLTA";
  return "AMBOS";
}

function converterTurnoParaApi(periodo) {
  if (periodo === "tarde") return "TARDE";
  if (periodo === "noite") return "NOITE";
  return "MANHA";
}

function obterResponsavelParaPayload(payload) {
  if (estaEmFluxoGuiado()) {
    const responsavel = encontrarResponsavelPorId(idResponsavelFluxo) || responsavelFluxo;

    if (!responsavel) {
      throw new Error("Responsável do fluxo não encontrado.");
    }

    return responsavel;
  }

  const responsavel = encontrarResponsavelPorNome(payload.responsavel1);

  if (!responsavel) {
    throw new Error("Responsável não cadastrado.");
  }

  return responsavel;
}

function montarPayloadAluno() {
  const tipoTrajeto = el.tipoTrajetoAluno ? el.tipoTrajetoAluno.value : "ambos";
  const embarque = el.enderecoEmbarque ? el.enderecoEmbarque.value.trim() : "";
  const desembarque = el.enderecoDesembarque ? el.enderecoDesembarque.value.trim() : "";

  const rota = normalizarRotaPorTrajeto({
    tipoTrajeto,
    embarque,
    desembarque,
    escola: el.escolaAluno ? el.escolaAluno.value.trim() : ""
  });

  return {
    id: el.alunoId.value || null,
    nome: el.nomeAluno.value.trim(),
    responsavel1: el.nomeResponsavel1.value.trim(),
    telefone1: el.telefoneResponsavel1.value.trim(),
    responsavel2: el.nomeResponsavel2 ? el.nomeResponsavel2.value.trim() : "",
    telefone2: el.telefoneResponsavel2 ? el.telefoneResponsavel2.value.trim() : "",
    embarque: rota.embarque,
    desembarque: rota.desembarque,
    escola: el.escolaAluno ? el.escolaAluno.value.trim() : "",
    tipoTrajeto,
    periodo: el.periodoAluno ? el.periodoAluno.value : "manha",
    horarioTurma: el.horarioTurmaAluno ? el.horarioTurmaAluno.value : ""
  };
}

async function salvarAluno(payload) {
  const responsavel = obterResponsavelParaPayload(payload);

  const form = new FormData();

  form.append("nome", payload.nome);
  form.append("endereco_embarque", payload.embarque);
  form.append("endereco_desembarque", payload.desembarque);
  form.append("escola", payload.escola);
  form.append("tipo_trajeto", converterTrajetoParaApi(payload.tipoTrajeto));
  form.append("turno", converterTurnoParaApi(payload.periodo));
  form.append("id_responsavel", String(responsavel.id_responsavel));

  /*
    O sistema atual considera apenas 1 condutor.
    Mantemos id_condutor = 1 para preservar o vínculo com o banco.
  */
  form.append("id_condutor", "1");

  if (el.fotoAluno.files[0]) {
    form.append("foto", el.fotoAluno.files[0]);
  }

  if (payload.id) {
    const alunoAtualizado = await window.API.put(`/alunos/${payload.id}`, form);
    return alunoAtualizado;
  }

  const alunoCriado = await window.API.post("/alunos", form);
  return alunoCriado;
}

/* =========================================================
   MODAL E FORMULÁRIO
   ========================================================= */

function configurarModal() {
  if (!el.btnAbrirModal) return;

  el.btnAbrirModal.addEventListener("click", abrirModalNovo);
  el.btnFecharModal.addEventListener("click", fecharModal);
  el.btnCancelar.addEventListener("click", fecharModal);

  if (el.tipoTrajetoAluno) {
    el.tipoTrajetoAluno.addEventListener("change", atualizarCamposEnderecoPorTrajeto);
  }

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

  const filtros = [
    el.filtroOrdem,
    el.filtroEscola,
    el.filtroTrajeto,
    el.filtroTurma,
    el.filtroVencimento
  ];

  filtros.forEach((campo) => campo && campo.addEventListener("change", renderizar));

  if (el.btnLimparFiltros) {
    el.btnLimparFiltros.addEventListener("click", () => {
      if (el.filtroOrdem) el.filtroOrdem.value = "alfabetica";
      if (el.filtroEscola) el.filtroEscola.value = "";
      if (el.filtroTrajeto) el.filtroTrajeto.value = "";
      if (el.filtroTurma) el.filtroTurma.value = "";
      if (el.filtroVencimento) el.filtroVencimento.value = "";
      renderizar();
    });
  }
}

function atualizarOpcoesEscola() {
  if (!el.filtroEscola) return;

  const escolas = [...new Set(alunos.map((aluno) => aluno.escola).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  el.filtroEscola.innerHTML = `
    <option value="">Todas as escolas</option>
    ${escolas.map((escola) => `<option value="${escola}">${escola}</option>`).join("")}
  `;
}

function atualizarOpcoesTurma() {
  if (!el.filtroTurma) return;

  const turmas = [...new Set(
    alunos.map((aluno) => `${aluno.periodo || "manha"}|${aluno.horarioTurma || "00:00"}`)
  )].sort((a, b) => a.localeCompare(b));

  el.filtroTurma.innerHTML = `
    <option value="">Todas as turmas</option>
    ${turmas.map((turma) => {
      const [periodo, horario] = turma.split("|");
      const periodoLabel = periodo === "manha" ? "Manhã" : periodo === "tarde" ? "Tarde" : "Noite";
      return `<option value="${turma}">${periodoLabel} • ${horario}</option>`;
    }).join("")}
  `;
}

function obterDescricaoTrajeto(tipo) {
  const trajetos = {
    ir: "Apenas ir",
    voltar: "Apenas voltar",
    ambos: "Ambos"
  };

  return trajetos[tipo] || "-";
}

function normalizarRotaPorTrajeto(aluno) {
  const embarqueOriginal = (aluno.embarque || "").trim();
  const desembarqueOriginal = (aluno.desembarque || "").trim();

  if (aluno.tipoTrajeto === "voltar") {
    return {
      embarque: desembarqueOriginal || embarqueOriginal,
      desembarque: embarqueOriginal || desembarqueOriginal
    };
  }

  if (aluno.tipoTrajeto === "ir") {
    return {
      embarque: embarqueOriginal,
      desembarque: desembarqueOriginal || aluno.escola || "Escola"
    };
  }

  return {
    embarque: embarqueOriginal,
    desembarque: desembarqueOriginal
  };
}

function obterAlunosFiltrados() {
  const busca = el.inputBusca ? el.inputBusca.value.trim().toLowerCase() : "";
  const escola = el.filtroEscola ? el.filtroEscola.value : "";
  const trajeto = el.filtroTrajeto ? el.filtroTrajeto.value : "";
  const turma = el.filtroTurma ? el.filtroTurma.value : "";
  const venc = el.filtroVencimento ? el.filtroVencimento.value : "";
  const ordem = el.filtroOrdem ? el.filtroOrdem.value : "alfabetica";

  let lista = alunos.filter((aluno) => {
    const textoBusca = [
      aluno.nome,
      aluno.responsavel1,
      aluno.responsavel2,
      aluno.escola,
      aluno.embarque,
      aluno.desembarque
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (!busca || textoBusca.includes(busca)) &&
      (!escola || aluno.escola === escola) &&
      (!trajeto || aluno.tipoTrajeto === trajeto) &&
      (!turma || `${aluno.periodo || "manha"}|${aluno.horarioTurma || "00:00"}` === turma) &&
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
   RENDERIZAÇÃO
   ========================================================= */

function renderizarTabela(lista) {
  if (!el.tbodyAlunos) return;

  if (!lista.length) {
    el.tbodyAlunos.innerHTML = "";
    if (el.emptyState) el.emptyState.style.display = "block";
    return;
  }

  if (el.emptyState) el.emptyState.style.display = "none";

  el.tbodyAlunos.innerHTML = lista.map((aluno) => `
    <tr>
      <td>
        <div class="celula-aluno">
          ${aluno.foto ? `<img src="${aluno.foto}" alt="Foto de ${aluno.nome}" class="foto-aluno">` : `<div class="foto-placeholder">SEM FOTO</div>`}
        </div>
      </td>
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
  `).join("");
}

function renderizarCardsMobile(lista) {
  if (!el.cardsAlunosMobile) return;

  if (!lista.length) {
    el.cardsAlunosMobile.innerHTML = "";
    return;
  }

  el.cardsAlunosMobile.innerHTML = lista.map((aluno) => `
    <article class="aluno-card-mobile trajeto-${aluno.tipoTrajeto}">
      <header>
        <strong>${aluno.nome || "-"}</strong>
        <span class="tag-trajeto">${obterDescricaoTrajeto(aluno.tipoTrajeto)}</span>
      </header>
      <p>${aluno.escola || "-"} • ${aluno.horarioTurma || "--:--"}</p>
      <p><b>Trajeto:</b> ${obterDescricaoTrajeto(aluno.tipoTrajeto)}</p>
    </article>
  `).join("");
}

function renderizarRotas(lista) {
  if (!el.rotasContainer) return;

  const porPeriodo = { manha: [], tarde: [], noite: [] };

  lista.forEach((a) => porPeriodo[a.periodo || "manha"]?.push(a));

  const periodos = [
    ["manha", "Manhã"],
    ["tarde", "Tarde"],
    ["noite", "Noite"]
  ];

  const html = periodos.map(([chavePeriodo, tituloPeriodo]) => {
    const listaPeriodo = porPeriodo[chavePeriodo] || [];

    if (!listaPeriodo.length) return "";

    const gruposHorario = {};

    listaPeriodo.forEach((a) => {
      const h = a.horarioTurma || "00:00";
      gruposHorario[h] = gruposHorario[h] || [];
      gruposHorario[h].push(a);
    });

    const blocosHorario = Object.entries(gruposHorario)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([horario, alunosHorario]) => {
        const ordemTrajeto = ["ir", "ambos", "voltar"];

        alunosHorario.sort((a, b) =>
          ordemTrajeto.indexOf(a.tipoTrajeto) - ordemTrajeto.indexOf(b.tipoTrajeto)
        );

        const itens = alunosHorario.map((a) => {
          const rota = normalizarRotaPorTrajeto(a);

          return `
            <li>
              <strong>${a.nome}</strong> — <span class="badge-trajeto ${a.tipoTrajeto}">${obterDescricaoTrajeto(a.tipoTrajeto)}</span><br>
              <small>Embarque: ${rota.embarque || "-"} | Desembarque: ${rota.desembarque || "-"}</small>
            </li>
          `;
        }).join("");

        return `<div class="rota-card"><h4>Horário ${horario}</h4><ul>${itens}</ul></div>`;
      }).join("");

    return `
      <section class="periodo-rota">
        <h3 class="titulo-periodo-rota">Alunos da ${tituloPeriodo}</h3>
        <div class="rotas-container-periodo">${blocosHorario}</div>
      </section>
    `;
  }).join("");

  el.rotasContainer.innerHTML = html || '<div class="empty-state">Nenhuma rota montada.</div>';
}

function renderizar() {
  const lista = obterAlunosFiltrados();
  renderizarTabela(lista);
  renderizarCardsMobile(lista);
  renderizarRotas(lista);
}

/* =========================================================
   FORMULÁRIO
   ========================================================= */

function configurarFormulario() {
  if (!el.formAluno) return;

  el.formAluno.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = montarPayloadAluno();

    if (!payload.nome || !payload.escola) {
      showWarning("Preencha nome do aluno e escola.");
      return;
    }

    if (payload.tipoTrajeto === "ir" && !payload.embarque) {
      showWarning("Informe o endereço de embarque.");
      return;
    }

    if (payload.tipoTrajeto === "voltar" && !payload.desembarque) {
      showWarning("Informe o endereço de desembarque.");
      return;
    }

    if (payload.tipoTrajeto === "ambos" && (!payload.embarque || !payload.desembarque)) {
      showWarning("Informe endereço de embarque e desembarque.");
      return;
    }

    if (!payload.periodo || !payload.horarioTurma) {
      showWarning("Preencha o período e o horário da turma.");
      return;
    }

    try {
      const novoCadastro = !payload.id;
      const alunoSalvo = await salvarAluno(payload);

      alunos = await carregarAlunos();

      fecharModal();
      atualizarOpcoesEscola();
      atualizarOpcoesTurma();
      renderizar();

      if (novoCadastro && estaEmFluxoGuiado()) {
        const idAluno = alunoSalvo?.id_aluno || alunoSalvo?.id;

        if (!idAluno) {
          showError("Aluno salvo, mas o ID não foi retornado pelo backend.");
          return;
        }

        window.location.href = montarUrlMensalidade(idAluno);
        return;
      }

      if (novoCadastro) {
        await showSuccess("Aluno cadastrado com sucesso.");
        return;
      }

      await showSuccess("Aluno atualizado com sucesso.");
    } catch (error) {
      console.error(error);
      showError(error.message || "Não foi possível salvar o aluno.");
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
      atualizarOpcoesTurma();
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
    grupoEnderecoEmbarque: document.getElementById("grupoEnderecoEmbarque"),
    grupoEnderecoDesembarque: document.getElementById("grupoEnderecoDesembarque"),
    fotoAluno: document.getElementById("fotoAluno"),
    previewFoto: document.getElementById("previewFoto"),
    avatarModalAluno: document.getElementById("avatarModalAluno"),
    escolaAluno: document.getElementById("escolaAluno"),
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
    filtroTurma: document.getElementById("filtroTurmaAluno"),
    filtroVencimento: document.getElementById("filtroVencimentoAluno"),
    btnLimparFiltros: document.getElementById("btnLimparFiltrosAluno"),
    botaoFiltroAluno: document.getElementById("botaoFiltroAluno"),
    painelFiltrosAluno: document.getElementById("painelFiltrosAluno"),
    rotasContainer: document.getElementById("rotasContainer"),
    cardsAlunosMobile: document.getElementById("cardsAlunosMobile")
  };
}

function abrirModalNovo() {
  if (!el.modalTitulo) return;

  el.modalTitulo.textContent = "Novo aluno";

  if (el.formAluno) el.formAluno.reset();
  if (el.alunoId) el.alunoId.value = "";

  if (el.nomeResponsavel1) {
    el.nomeResponsavel1.required = true;
    el.nomeResponsavel1.readOnly = false;
  }

  if (el.telefoneResponsavel1) {
    el.telefoneResponsavel1.required = false;
    el.telefoneResponsavel1.readOnly = false;
  }

  esconderPreviewFoto();
  atualizarCamposEnderecoPorTrajeto();

  if (el.modalOverlay) {
    el.modalOverlay.classList.remove("hidden");
  }
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
  if (el.tipoTrajetoAluno) el.tipoTrajetoAluno.value = aluno.tipoTrajeto || "ambos";
  if (el.periodoAluno) el.periodoAluno.value = aluno.periodo || "manha";
  if (el.horarioTurmaAluno) el.horarioTurmaAluno.value = aluno.horarioTurma || "";

  aluno.foto ? mostrarPreviewFoto(aluno.foto) : esconderPreviewFoto();

  atualizarCamposEnderecoPorTrajeto();

  if (el.modalOverlay) {
    el.modalOverlay.classList.remove("hidden");
  }
}

function fecharModal() {
  if (el.modalOverlay) {
    el.modalOverlay.classList.add("hidden");
  }
}

function mostrarPreviewFoto(src) {
  if (el.previewFoto) {
    el.previewFoto.src = src;
    el.previewFoto.style.display = "block";
  }

  if (el.avatarModalAluno) {
    el.avatarModalAluno.classList.add("com-foto");
  }

  const placeholderIcon = document.getElementById("avatarPlaceholderIcon");

  if (placeholderIcon) {
    placeholderIcon.style.display = "none";
  }
}

function esconderPreviewFoto() {
  if (el.previewFoto) {
    el.previewFoto.src = "";
    el.previewFoto.style.display = "none";
  }

  if (el.avatarModalAluno) {
    el.avatarModalAluno.classList.remove("com-foto");
  }

  const placeholderIcon = document.getElementById("avatarPlaceholderIcon");

  if (placeholderIcon) {
    placeholderIcon.style.display = "block";
  }
}

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

window.addEventListener("DOMContentLoaded", async () => {
  initMenu();

  el = obterElementos();

  if (!el || !el.formAluno) return;

  lerParametrosFluxo();

  alunos = await carregarAlunos();
  responsaveis = await carregarResponsaveis();

  await carregarResponsavelDoFluxo();

  configurarModal();
  configurarBuscaEFiltros();
  configurarMascaras();
  configurarAutocompletarResponsavel();
  configurarPreviewFoto();
  configurarFormulario();
  configurarTabela();

  atualizarOpcoesEscola();
  atualizarOpcoesTurma();
  renderizar();

  abrirFluxoGuiadoSeNecessario();
});