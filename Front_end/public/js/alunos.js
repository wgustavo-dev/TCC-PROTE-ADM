/* =========================================================
   VARIÁVEIS GLOBAIS
   ========================================================= */

let alunos = [];
let responsaveis = [];
let escolasDisponiveis = [];
let el = null;

/* =========================================================
   PERMISSÕES (C3)
   Monitor pode visualizar os alunos, mas não pode cadastrar,
   editar nem excluir — apenas o Condutor tem essas ações.
   ========================================================= */
function usuarioEhMonitor() {
  try {
    const usuario = JSON.parse(window.localStorage.getItem("prote_user") || "null");
    return Boolean(usuario && usuario.role === "MONITOR");
  } catch (erro) {
    return false;
  }
}

let fluxoCadastro = null;
let idResponsavelFluxo = null;
let idOrcamentoFluxo = null;
let alunoAtualFluxo = 1;
let totalAlunosFluxo = 1;

function emFluxoCadastro() {
  return Boolean(fluxoCadastro && idResponsavelFluxo);
}

function obterParametrosFluxo() {
  const params = new URLSearchParams(window.location.search);
  const fluxo = params.get("fluxo");
  const idResponsavel = params.get("id_responsavel");

  if (!fluxo || !idResponsavel) return false;

  fluxoCadastro = fluxo;
  idResponsavelFluxo = Number(idResponsavel);
  idOrcamentoFluxo = params.get("id_orcamento") ? Number(params.get("id_orcamento")) : null;
  alunoAtualFluxo = Number(params.get("alunoAtual") || 1);
  totalAlunosFluxo = Number(params.get("totalAlunos") || 1);
  return true;
}

function mapTrajetoOrcamento(tipo) {
  const valor = String(tipo || "").toUpperCase();
  if (valor === "IDA") return "ir";
  if (valor === "VOLTA") return "voltar";
  return "ambos";
}

function mapTurnoOrcamento(turno) {
  const valor = String(turno || "").toUpperCase();
  if (valor === "TARDE") return "tarde";
  return "manha";
}

function definirCamposResponsavelFluxo(responsavel, bloquear) {
  if (!responsavel) return;

  if (el.nomeResponsavel1) {
    el.nomeResponsavel1.value = aplicarMascaraNome(responsavel.nome || "");
    el.nomeResponsavel1.readOnly = bloquear;
  }

  if (el.telefoneResponsavel1) {
    el.telefoneResponsavel1.value = aplicarMascaraTelefone(responsavel.telefone || "");
    el.telefoneResponsavel1.readOnly = bloquear;
  }
}

function redirecionarParaMensalidade(alunoSalvo, vencimentoDia) {
  const params = new URLSearchParams();
  params.set("fluxo", fluxoCadastro);
  params.set("id_responsavel", String(idResponsavelFluxo));
  params.set("id_aluno", String(alunoSalvo.id_aluno));
  params.set("alunoAtual", String(alunoAtualFluxo));
  params.set("totalAlunos", String(totalAlunosFluxo));

  if (idOrcamentoFluxo) {
    params.set("id_orcamento", String(idOrcamentoFluxo));
  }

  if (vencimentoDia) {
    params.set("vencimento", vencimentoDia);
  }

  window.location.href = `mensalidade.html?${params.toString()}`;
}

async function iniciarFluxoCadastro() {
  if (!obterParametrosFluxo()) return;

  const responsavel = responsaveis.find(
    (item) => Number(item.id_responsavel) === idResponsavelFluxo
  );

  abrirModalNovo();

  if (el.modalTitulo) {
    el.modalTitulo.textContent = `Cadastrar aluno ${alunoAtualFluxo} de ${totalAlunosFluxo}`;
  }

  definirCamposResponsavelFluxo(responsavel, true);

  if (fluxoCadastro === "orcamento" && idOrcamentoFluxo) {
    try {
      const orcamento = await window.API.get(`/orcamentos/${idOrcamentoFluxo}`);

      if (el.escolaAluno) el.escolaAluno.value = encontrarEscolaPorNome(orcamento.escola) || "";
      if (el.enderecoEmbarque) el.enderecoEmbarque.value = orcamento.endereco_embarque || "";
      if (el.enderecoDesembarque) el.enderecoDesembarque.value = orcamento.endereco_desembarque || "";
      if (el.tipoTrajetoAluno) el.tipoTrajetoAluno.value = mapTrajetoOrcamento(orcamento.tipo_trajeto);
      if (el.periodoAluno) el.periodoAluno.value = mapTurnoOrcamento(orcamento.turno);
    } catch (error) {
      console.error(error);
      showWarning("Não foi possível carregar os dados do orçamento para pré-preencher o aluno.");
    }
  }

  if (el.nomeAluno) el.nomeAluno.focus();
}

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
    idEscola: item.escola ? item.escola.id_escola : null,
    escola: item.escola ? item.escola.nome : "",
    vencimento: item.vencimento || "",
    tipoTrajeto: item.tipo_trajeto === "IDA" ? "ir" : item.tipo_trajeto === "VOLTA" ? "voltar" : "ambos",
    periodo: item.turno ? item.turno.toLowerCase() : "manha"
  };
}

/* =========================================================
   SISTEMA DE ITINERÁRIOS (C3)
   A partir do Período (manhã/tarde) e do Trajeto (ir/voltar/ambos)
   de cada aluno, o sistema organiza automaticamente quatro listas:
   ida/manhã, volta/manhã, ida/tarde e volta/tarde. Um aluno com
   trajeto "ambos" entra tanto na lista de ida quanto na de volta
   do seu período. Essas listas servem de base para o sistema de
   itinerários.
   ========================================================= */
const LISTAS_ITINERARIO = [
  { chave: "manha-ida", periodo: "manha", sentido: "ida", titulo: "Ida - Manhã" },
  { chave: "manha-volta", periodo: "manha", sentido: "volta", titulo: "Volta - Manhã" },
  { chave: "tarde-ida", periodo: "tarde", sentido: "ida", titulo: "Ida - Tarde" },
  { chave: "tarde-volta", periodo: "tarde", sentido: "volta", titulo: "Volta - Tarde" }
];

function alunoPertenceALista(aluno, lista) {
  const periodo = aluno.periodo || "manha";
  if (periodo !== lista.periodo) return false;

  if (lista.sentido === "ida") {
    return aluno.tipoTrajeto === "ir" || aluno.tipoTrajeto === "ambos";
  }
  return aluno.tipoTrajeto === "voltar" || aluno.tipoTrajeto === "ambos";
}

function montarListasItinerario(lista) {
  const resultado = {};
  LISTAS_ITINERARIO.forEach((definicao) => {
    resultado[definicao.chave] = lista.filter((aluno) => alunoPertenceALista(aluno, definicao));
  });
  return resultado;
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

async function carregarEscolas() {
  try {
    const data = await window.API.get("/escolas");
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(error);
    showError("Não foi possível carregar as escolas.");
    return [];
  }
}

function encontrarResponsavelPorNome(nome) {
  const nomeNormalizado = (nome || "").trim().toLowerCase();
  if (!nomeNormalizado) return null;
  return responsaveis.find((item) => (item.nome || "").trim().toLowerCase() === nomeNormalizado) || null;
}

function encontrarEscolaPorNome(nome) {
  const nomeNormalizado = (nome || "").trim().toLowerCase();
  if (!nomeNormalizado) return null;
  const escola = escolasDisponiveis.find((item) => (item.nome || "").trim().toLowerCase() === nomeNormalizado);
  return escola ? escola.id_escola : null;
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
  const tipoTrajeto = el.tipoTrajetoAluno ? el.tipoTrajetoAluno.value : "ambos";
  const embarque = el.enderecoEmbarque.value.trim();
  const desembarque = el.enderecoDesembarque.value.trim();
  const idEscola = el.escolaAluno && el.escolaAluno.value ? Number(el.escolaAluno.value) : null;
  const escolaNome = el.escolaAluno && el.escolaAluno.selectedOptions.length
    ? el.escolaAluno.selectedOptions[0].textContent.trim()
    : "";
  const rota = normalizarRotaPorTrajeto({ tipoTrajeto, embarque, desembarque, escola: escolaNome });

  return {
    id: el.alunoId.value || null,
    nome: el.nomeAluno.value.trim(),
    responsavel1: el.nomeResponsavel1.value.trim(),
    telefone1: el.telefoneResponsavel1.value.trim(),
    responsavel2: el.nomeResponsavel2 ? el.nomeResponsavel2.value.trim() : "",
    telefone2: el.telefoneResponsavel2 ? el.telefoneResponsavel2.value.trim() : "",
    embarque: rota.embarque,
    desembarque: rota.desembarque,
    idEscola,
    escola: escolaNome,
    vencimento: el.vencimentoAluno ? el.vencimentoAluno.value : "",
    tipoTrajeto,
    periodo: el.periodoAluno ? el.periodoAluno.value : "manha"
  };
}

async function salvarAluno(payload, idResponsavel) {
  const form = new FormData();
  form.append("nome", payload.nome);
  form.append("endereco_embarque", payload.embarque);
  form.append("endereco_desembarque", payload.desembarque);
  if (idResponsavel) {
    form.append("id_responsavel", String(idResponsavel));
  } else {
    form.append("responsavel_nome", payload.responsavel1);
    form.append("responsavel_telefone", payload.telefone1);
  }
  form.append("id_escola", String(payload.idEscola));
  const tipoTrajetoApi = payload.tipoTrajeto === "ir" ? "IDA" : payload.tipoTrajeto === "voltar" ? "VOLTA" : "AMBOS";
  const turnoApi = payload.periodo ? payload.periodo.toUpperCase() : "MANHA";

    form.append("tipo_trajeto", tipoTrajetoApi);
    form.append("turno", turnoApi);

    if (el.fotoAluno?.files?.[0]) {
        form.append("foto", el.fotoAluno.files[0]);
    }

  if (payload.id) {
    await window.API.put(`/alunos/${payload.id}`, form);
    return null;
  }

  return await window.API.post("/alunos", form);
}

/* =========================================================
   FUNÇÕES DE MODAL E FORMULÁRIO
   ========================================================= */

function configurarModal() {
  if (el.btnFecharModal) el.btnFecharModal.addEventListener("click", fecharModalSeguroAluno);
  if (el.btnCancelar) el.btnCancelar.addEventListener("click", fecharModalSeguroAluno);
  if (el.modalOverlay) {
    el.modalOverlay.addEventListener("click", (event) => {
      if (event.target === el.modalOverlay) fecharModalSeguroAluno();
    });
  }
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

  const filtros = [el.filtroOrdem, el.filtroEscola, el.filtroTrajeto, el.filtroTurma, el.filtroVencimento];
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
  const opcoes = escolasDisponiveis
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((escola) => `<option value="${escola.id_escola}">${escola.nome}</option>`)
    .join("");

  if (el.filtroEscola) {
    el.filtroEscola.innerHTML = `<option value="">Todas as escolas</option>${opcoes}`;
  }

  if (el.escolaAluno) {
    el.escolaAluno.innerHTML = `<option value="">Selecione...</option>${opcoes}`;
  }
}

function atualizarOpcoesTurma() {
  if (!el.filtroTurma) return;

  el.filtroTurma.innerHTML = `
    <option value="">Todas as listas</option>
    ${LISTAS_ITINERARIO.map((lista) => `<option value="${lista.chave}">${lista.titulo}</option>`).join("")}
  `;
}

function obterDescricaoTrajeto(tipo) {
  const trajetos = {
    ir: "Ida",
    voltar: "Volta",
    ambos: "Ida e Volta"
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
    const textoBusca = [aluno.nome, aluno.responsavel1, aluno.responsavel2, aluno.escola, aluno.embarque, aluno.desembarque]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const listaSelecionada = turma ? LISTAS_ITINERARIO.find((item) => item.chave === turma) : null;

    return (
      (!busca || textoBusca.includes(busca)) &&
      (!escola || aluno.idEscola === Number(escola)) &&
      (!trajeto || aluno.tipoTrajeto === trajeto) &&
      (!listaSelecionada || alunoPertenceALista(aluno, listaSelecionada)) &&
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
        ${usuarioEhMonitor() ? `<span class="texto-somente-leitura">Somente visualização</span>` : `
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
        `}
      </td>
    </tr>
    `
    )
    .join("");
}

/* =========================================================
   RENDERIZAÇÃO DE ROTAS
   ========================================================= */


function renderizarCardsMobile(lista) {
  if (!el.cardsAlunosMobile) return;
  if (!lista.length) {
    el.cardsAlunosMobile.innerHTML = "";
    return;
  }

  el.cardsAlunosMobile.innerHTML = lista.map((aluno) => {
    const rota = normalizarRotaPorTrajeto(aluno);
    return `
      <article class="aluno-card-mobile trajeto-${aluno.tipoTrajeto}">
        <header>
          <strong>${aluno.nome || "-"}</strong>
          <span class="tag-trajeto">${obterDescricaoTrajeto(aluno.tipoTrajeto)}</span>
        </header>
        <p>${aluno.escola || "-"}</p>
        <p><b>Trajeto:</b> ${obterDescricaoTrajeto(aluno.tipoTrajeto)}</p>
      </article>`;
  }).join("");
}

function renderizarRotas(lista) {
  if (!el.rotasContainer) return;

  const listasItinerario = montarListasItinerario(lista);

  const html = LISTAS_ITINERARIO.map((definicao) => {
    const alunosLista = listasItinerario[definicao.chave] || [];
    if (!alunosLista.length) return "";

    const itens = alunosLista
      .slice()
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"))
      .map((a) => {
        const rota = normalizarRotaPorTrajeto(a);
        return `<li><strong>${a.nome}</strong> — <span class="badge-trajeto ${a.tipoTrajeto}">${obterDescricaoTrajeto(a.tipoTrajeto)}</span><br><small>Embarque: ${rota.embarque || "-"} | Desembarque: ${rota.desembarque || "-"}</small></li>`;
      }).join("");

    return `<section class="periodo-rota"><h3 class="titulo-periodo-rota">${definicao.titulo}</h3><div class="rotas-container-periodo"><div class="rota-card"><ul>${itens}</ul></div></div></section>`;
  }).join("");

  el.rotasContainer.innerHTML = html || '<div class="empty-state">Nenhuma rota montada.</div>';
}

/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================= */

function renderizar() {
  const lista = obterAlunosFiltrados();
  renderizarTabela(lista);
  renderizarCardsMobile(lista);
  renderizarRotas(lista);
}

/* =========================================================
   CRUD E CONFIGURAÇÕES DA TABELA - VERSÃO CORRIGIDA
   ========================================================= */

function configurarFormulario() {
  if (!el.formAluno) return;
  
  console.log('Configurando formulário de alunos');
  
  el.formAluno.addEventListener("submit", async (event) => {
    console.log('Formulário enviado (submit)');
    event.preventDefault();

    const payload = montarPayloadAluno();
    const fluxoAtivo = emFluxoCadastro() && !payload.id;
    
    if (!fluxoAtivo) {
      if (!payload.responsavel1 || payload.responsavel1.trim() === "") {
        showWarning("O campo 'Responsável 1' é obrigatório.");
        return;
      }
    }

    // Validação dos campos obrigatórios do aluno
    if (!payload.nome || !payload.embarque || !payload.desembarque || !payload.idEscola || !payload.vencimento) {
      console.warn('Validação falhou. Campos vazios:', {
        nome: !!payload.nome,
        embarque: !!payload.embarque,
        desembarque: !!payload.desembarque,
        idEscola: !!payload.idEscola,
        vencimento: !!payload.vencimento
      });
      showWarning("Preencha todos os campos obrigatórios do aluno.");
      return;
    }

    // Validação de período
    if (!payload.periodo) {
      console.warn('Validação de período falhou.');
      showWarning("Selecione o período do aluno.");
      return;
    }

    if (!fluxoAtivo) {
      const responsavelSelecionado = encontrarResponsavelPorNome(payload.responsavel1);
      
      if (!responsavelSelecionado) {
        showWarning("Responsável não encontrado. O cadastro de novos alunos deve ser feito pelo fluxo de aprovação de orçamento.");
        return;
      }

      payload.responsavel1 = responsavelSelecionado.nome || payload.responsavel1;
      payload.telefone1 = aplicarMascaraTelefone(responsavelSelecionado.telefone || "");
      if (el.telefoneResponsavel1) el.telefoneResponsavel1.value = payload.telefone1;
    }

    try {
      console.log('Iniciando salvamento do aluno...');
      const novoCadastro = !payload.id;
      const idResponsavelSalvar = fluxoAtivo
        ? idResponsavelFluxo
        : encontrarResponsavelPorNome(payload.responsavel1)?.id_responsavel;

      const alunoSalvo = await salvarAluno(payload, idResponsavelSalvar);
      alunos = await carregarAlunos();
      console.log('Alunos recarregados, total:', alunos.length);
      
      fecharModal();
      atualizarOpcoesEscola();
      atualizarOpcoesTurma();
      atualizarOpcoesTurma();
      renderizar();

      if (fluxoAtivo && alunoSalvo) {
        redirecionarParaMensalidade(alunoSalvo, payload.vencimento);
        return;
      }
      
      await showSuccess(
        `${payload.id ? "Aluno atualizado" : "Aluno cadastrado"} com sucesso!\n\n` +
        `Nome: ${payload.nome}\n` +
        `Período: ${payload.periodo === "manha" ? "Manhã" : "Tarde"}\n` +
        `Trajeto: ${payload.tipoTrajeto === "ir" ? "Ida" : payload.tipoTrajeto === "voltar" ? "Volta" : "Ida e Volta"}`
      );
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      showError(`Não foi possível salvar o aluno: ${error.message || error}`);
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
    fotoAluno: document.getElementById("fotoAluno"),
    linkFotoAluno: document.getElementById("linkFotoAluno"),
    previewFoto: document.getElementById("previewFoto"),
    avatarModalAluno: document.getElementById("avatarModalAluno"),
    escolaAluno: document.getElementById("escolaAluno"),
    vencimentoAluno: document.getElementById("vencimentoAluno"),
    tipoTrajetoAluno: document.getElementById("tipoTrajetoAluno"),
    periodoAluno: document.getElementById("periodoAluno"),
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
  if (el.linkFotoAluno) el.linkFotoAluno.value = "";
  esconderPreviewFoto();
  if (el.modalOverlay) el.modalOverlay.classList.remove("hidden");
  registrarEstadoInicialFormulario(el.formAluno);
}

function abrirModalEditar(aluno) {
  if (!el.modalTitulo) return;
  el.modalTitulo.textContent = "Editar aluno";
  if (el.nomeResponsavel1) el.nomeResponsavel1.readOnly = false;
  if (el.telefoneResponsavel1) el.telefoneResponsavel1.readOnly = false;
  if (el.alunoId) el.alunoId.value = aluno.id || "";
  if (el.nomeAluno) el.nomeAluno.value = aplicarMascaraNome(aluno.nome || "");
  if (el.nomeResponsavel1) el.nomeResponsavel1.value = aplicarMascaraNome(aluno.responsavel1 || "");
  if (el.telefoneResponsavel1) el.telefoneResponsavel1.value = aplicarMascaraTelefone(aluno.telefone1 || "");
  if (el.enderecoEmbarque) el.enderecoEmbarque.value = aplicarMascaraEndereco(aluno.embarque || "");
  if (el.enderecoDesembarque) el.enderecoDesembarque.value = aplicarMascaraEndereco(aluno.desembarque || "");
  if (el.escolaAluno) el.escolaAluno.value = aluno.idEscola || "";
  if (el.vencimentoAluno) el.vencimentoAluno.value = aluno.vencimento || "";
  if (el.tipoTrajetoAluno) el.tipoTrajetoAluno.value = aluno.tipoTrajeto || "ambos";
  if (el.periodoAluno) el.periodoAluno.value = aluno.periodo || "manha";
  if (el.linkFotoAluno) el.linkFotoAluno.value = "";
  aluno.foto ? mostrarPreviewFoto(aluno.foto) : esconderPreviewFoto();
  if (el.modalOverlay) el.modalOverlay.classList.remove("hidden");
  registrarEstadoInicialFormulario(el.formAluno);
}

function fecharModal() {
  if (el.modalOverlay) el.modalOverlay.classList.add("hidden");
}

function fecharModalSeguroAluno() {
  return fecharModalSeguro(el.formAluno, fecharModal);
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

async function abrirCadastroAlunoVindoDeResponsavel() {
  const params = new URLSearchParams(window.location.search);

  if (!params.has("novoResponsavel")) return;

  const raw = localStorage.getItem("responsavelParaAluno");
  if (!raw) return;

  try {
    const responsavel = JSON.parse(raw);

    // Atualiza a lista de responsáveis depois que voltou da tela de responsáveis
    responsaveis = await carregarResponsaveis();

    abrirModalNovo();

    if (el.nomeResponsavel1) {
      el.nomeResponsavel1.value = aplicarMascaraNome(responsavel.nome || "");
    }

    if (el.telefoneResponsavel1) {
      el.telefoneResponsavel1.value = aplicarMascaraTelefone(responsavel.telefone || "");
    }

    if (el.nomeAluno) {
      el.nomeAluno.focus();
    }

    showSuccess("Responsável cadastrado! Agora complete os dados do aluno.");
  } catch (error) {
    console.error(error);
  } finally {
    localStorage.removeItem("responsavelParaAluno");

    const limpa = new URL(window.location.href);
    limpa.searchParams.delete("novoResponsavel");
    window.history.replaceState({}, "", limpa.pathname + (limpa.search ? limpa.search : ""));
  }
}

async function processarRetornoResponsavel() {
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
        if (el.escolaAluno) {
          el.escolaAluno.value = dados.alunoData.idEscola
            || encontrarEscolaPorNome(dados.alunoData.escola)
            || "";
        }
        if (el.vencimentoAluno) el.vencimentoAluno.value = dados.alunoData.vencimento || "";
        if (el.tipoTrajetoAluno) el.tipoTrajetoAluno.value = dados.alunoData.tipoTrajeto || "ambos";
        if (el.periodoAluno) el.periodoAluno.value = dados.alunoData.periodo || "manha";
        
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

  const monitor = usuarioEhMonitor();

  alunos = await carregarAlunos();
  responsaveis = monitor ? [] : await carregarResponsaveis();
  escolasDisponiveis = await carregarEscolas();

  configurarModal();
  configurarBuscaEFiltros();
  if (!monitor) {
    configurarMascaras();
    configurarAutocompletarResponsavel();
    configurarPreviewFoto();
    configurarFormulario();
  }
  configurarTabela();

  atualizarOpcoesEscola();
  atualizarOpcoesTurma();
  renderizar();

  if (!monitor) {
    await iniciarFluxoCadastro();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && el?.modalOverlay && !el.modalOverlay.classList.contains('hidden')) {
    fecharModalSeguroAluno();
  }
});
