/* =========================================================
   VARIÁVEIS GLOBAIS
   ========================================================= */

let mensalidades = [];
let alunos = [];
let idEditando = null;

let fluxoCadastro = null;
let idResponsavelFluxo = null;
let idOrcamentoFluxo = null;
let idAlunoFluxo = null;
let alunoAtualFluxo = 1;
let totalAlunosFluxo = 1;

function emFluxoCadastro() {
  return Boolean(fluxoCadastro && idAlunoFluxo);
}

function obterParametrosFluxo() {
  const params = new URLSearchParams(window.location.search);
  const fluxo = params.get("fluxo");
  const idAluno = params.get("id_aluno");

  if (!fluxo || !idAluno) return false;

  fluxoCadastro = fluxo;
  idAlunoFluxo = Number(idAluno);
  idResponsavelFluxo = params.get("id_responsavel") ? Number(params.get("id_responsavel")) : null;
  idOrcamentoFluxo = params.get("id_orcamento") ? Number(params.get("id_orcamento")) : null;
  alunoAtualFluxo = Number(params.get("alunoAtual") || 1);
  totalAlunosFluxo = Number(params.get("totalAlunos") || 1);
  return true;
}

function definirValorCampo(id, value, readOnly = false) {
  const campo = document.getElementById(id);
  if (!campo) return;
  campo.value = value ?? "";
  campo.readOnly = readOnly;
}

async function proximoPassoFluxo() {
  fecharModal();

  if (alunoAtualFluxo < totalAlunosFluxo) {
    const params = new URLSearchParams();
    params.set("fluxo", fluxoCadastro);
    params.set("id_responsavel", String(idResponsavelFluxo));
    params.set("alunoAtual", String(alunoAtualFluxo + 1));
    params.set("totalAlunos", String(totalAlunosFluxo));
    if (idOrcamentoFluxo) params.set("id_orcamento", String(idOrcamentoFluxo));
    window.location.href = `alunos.html?${params.toString()}`;
    return;
  }

  if (fluxoCadastro === "orcamento" && idOrcamentoFluxo) {
    await window.API.put(`/orcamentos/${idOrcamentoFluxo}/finalizar-conversao`, {});
  }

  await showSuccess("Novo cliente cadastrado com sucesso!");
  window.history.replaceState({}, document.title, "mensalidade.html");
  await carregarDados();
  atualizarOpcoesEscola();
  renderizarTabela();
  atualizarResumo();
}

async function iniciarFluxoCadastro() {
  if (!obterParametrosFluxo()) return;

  const aluno = alunos.find((item) => Number(item.id_aluno) === idAlunoFluxo);
  if (!aluno) {
    showError("Aluno do fluxo não encontrado.");
    return;
  }

  idEditando = null;

  const titulo = document.getElementById("tituloModalMensalidade");
  if (titulo) titulo.textContent = `Mensalidade — aluno ${alunoAtualFluxo} de ${totalAlunosFluxo}`;
  if (botaoSalvar) botaoSalvar.textContent = "Cadastrar";

  definirValorCampo("campoIdMensalidade", "");
  definirValorCampo("campoAlunoMensalidade", String(aluno.id_aluno || ""), true);
  definirValorCampo("campoResponsavelMensalidade", aluno.responsavel?.nome || "", true);
  definirValorCampo("campoContatoMensalidade", aplicarMascaraTelefoneMensalidade(aluno.responsavel?.telefone || ""), true);
  definirValorCampo("campoEscolaMensalidade", aluno.escola?.nome || "", true);
  // Sugere o dia de hoje como ponto de partida; o usuário ajusta se quiser.
  definirValorCampo("campoVencimentoMensalidade", String(new Date().getDate()), false);
  // Status e data de pagamento saíram do formulário: toda mensalidade
  // nova já nasce PENDENTE (o backend garante isso), e marcar como paga
  // é feito depois, pelo botão "Marcar como paga" na listagem.

  const nomeAlunoSpan = document.getElementById("nomeAlunoModalInfo");
  const responsavelSpan = document.getElementById("responsavelModalInfo");
  if (nomeAlunoSpan) nomeAlunoSpan.textContent = aluno.nome || "Aluno";
  if (responsavelSpan) responsavelSpan.textContent = aluno.responsavel?.nome || "Responsável";

  if (idOrcamentoFluxo) {
    try {
      const orcamento = await window.API.get(`/orcamentos/${idOrcamentoFluxo}`);
      definirValorCampo("campoValorMensalidade", orcamento.valor || "");
    } catch (error) {
      console.error(error);
    }
  }

  if (fundoModal) fundoModal.classList.add("ativo");
}

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
  if (status === "pago") return `<span class="status-badge status-pago">PAGO</span>`;
  if (status === "atrasado") return `<span class="status-badge status-atrasado">ATRASADO</span>`;
  return `<span class="status-badge status-pendente">PENDENTE</span>`;
}

function aplicarMascaraTelefoneMensalidade(valor) {
  const numeros = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (!numeros) return "";

  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function aplicarMascaraNomeMensalidade(valor) {
  return String(valor || "")
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 100);
}

function aplicarMascaraValorMensalidade(valor) {
  const texto = String(valor || "").replace(/[R$\s]/g, "").trim();
  const numeros = texto.replace(/[^\d,]/g, "");

  if (!numeros) return "";

  const semSeparador = numeros.replace(/\./g, "").replace(",", ".");
  const numero = Number(semSeparador);

  if (!Number.isFinite(numero)) return "";

  const parteInteira = Math.trunc(numero);
  const parteDecimal = Math.round((numero - parteInteira) * 100);
  const valorFormatado = (parteInteira + (parteDecimal / 100)).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return valorFormatado;
}

function normalizarValorMensalidade(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return null;

  const numero = Number(
    texto
      .replace(/[R$\s]/g, "")
      .replace(".", "")
      .replace(",", ".")
  );

  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Number(numero.toFixed(2));
}

function validarDataISO(dataTexto) {
  const valor = String(dataTexto || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

  const data = new Date(`${valor}T12:00:00`);
  const [ano, mes, dia] = valor.split("-").map(Number);

  return !Number.isNaN(data.getTime()) && data.getFullYear() === ano && data.getMonth() + 1 === mes && data.getDate() === dia;
}

/*
  NOVO: o campo de vencimento do formulário agora só pede o DIA
  ("todo dia X"), não mais uma data completa. Essas funções cuidam da
  conversão dia <-> data ISO completa (usando o mês/ano atual como
  referência) e da checagem de que o dia é válido (1 a 31).
*/
function validarDiaVencimento(diaTexto) {
  const dia = Number(diaTexto);
  return Number.isInteger(dia) && dia >= 1 && dia <= 31;
}

function ultimoDiaDoMes(ano, mesIndexado1) {
  return new Date(ano, mesIndexado1, 0).getDate();
}

// Monta "YYYY-MM-DD" para o mês/ano de referência, usando o dia
// desejado (limitado ao último dia real daquele mês).
function montarDataVencimento(diaDesejado, referencia = new Date()) {
  const ano = referencia.getFullYear();
  const mesIndexado1 = referencia.getMonth() + 1;
  const dia = Math.min(Math.max(1, Number(diaDesejado)), ultimoDiaDoMes(ano, mesIndexado1));
  const mesTexto = String(mesIndexado1).padStart(2, "0");
  const diaTexto = String(dia).padStart(2, "0");
  return `${ano}-${mesTexto}-${diaTexto}`;
}

// Extrai só o dia (número) de uma data ISO "YYYY-MM-DD" já existente,
// para preencher o campo "Todo dia X" ao editar uma mensalidade.
function extrairDiaDeDataISO(dataISO) {
  if (!dataISO) return "";
  const partes = String(dataISO).split("-");
  if (partes.length !== 3) return "";
  return String(Number(partes[2]));
}

const NOMES_MESES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

// "2026-08" -> "AGOSTO" "2026"
function formatarMesAnoFiltro(mesAno) {
  const partes = String(mesAno || "").split("-");
  if (partes.length !== 2) return "";
  const [ano, mes] = partes;
  const nomeMes = NOMES_MESES[Number(mes) - 1] || "";
  return `${nomeMes} ${ano}`;
}

function mesAnoAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
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
    contato: [aplicarMascaraTelefoneMensalidade(item.aluno?.responsavel?.telefone)].filter(Boolean),
    escola: item.aluno?.escola?.nome || "",
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

  // NOVO: filtro de mês parte sempre no mês atual, mostrado como
  // "AGOSTO" "2026" no label ao lado do seletor nativo.
  const labelMesVencimento = document.getElementById("labelMesVencimentoMensalidade");
  const atualizarLabelMes = () => {
    if (!labelMesVencimento) return;
    const valor = filtroVencimento ? filtroVencimento.value : "";
    labelMesVencimento.textContent = valor ? formatarMesAnoFiltro(valor) : "TODOS OS MESES";
  };

  if (filtroVencimento && !filtroVencimento.value) {
    filtroVencimento.value = mesAnoAtual();
  }
  atualizarLabelMes();

  if (filtroVencimento) {
    filtroVencimento.addEventListener("change", () => {
      atualizarLabelMes();
      renderizarTabela();
    });
  }
  if (filtroOrdem) filtroOrdem.addEventListener("change", renderizarTabela);
  if (filtroEscola) filtroEscola.addEventListener("change", renderizarTabela);
  if (campoBusca) campoBusca.addEventListener("input", renderizarTabela);

  if (btnLimparFiltros) {
    btnLimparFiltros.addEventListener("click", () => {
      if (filtroVencimento) filtroVencimento.value = mesAnoAtual();
      atualizarLabelMes();
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

function renderizarOpcoesAluno() {
  const campoAluno = document.getElementById("campoAlunoMensalidade");
  if (!campoAluno) return;

  const valorAtual = campoAluno.value || "";
  const opcoes = alunos
    .filter((aluno) => aluno && Number.isFinite(Number(aluno.id_aluno)))
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"))
    .map((aluno) => `<option value="${aluno.id_aluno}">${aluno.nome}</option>`)
    .join("");

  campoAluno.innerHTML = `
    <option value="">Selecione um aluno</option>
    ${opcoes}
  `;

  if (valorAtual) {
    campoAluno.value = String(valorAtual);
  }
}

function preencherDadosAlunoSelecionado() {
  const campoAluno = document.getElementById("campoAlunoMensalidade");
  const campoEscola = document.getElementById("campoEscolaMensalidade");
  const campoContato = document.getElementById("campoContatoMensalidade");
  const campoResponsavel = document.getElementById("campoResponsavelMensalidade");

  if (!campoAluno) return;

  const idAluno = Number(campoAluno.value || 0);
  const aluno = alunos.find((item) => Number(item.id_aluno) === idAluno);

  if (campoEscola) {
    campoEscola.value = aluno?.escola?.nome || aluno?.escola || "";
  }

  if (campoContato) {
    campoContato.value = aplicarMascaraTelefoneMensalidade(aluno?.responsavel?.telefone || "");
  }

  if (campoResponsavel) {
    campoResponsavel.value = aplicarMascaraNomeMensalidade(aluno?.responsavel?.nome || "");
  }

  const nomeAlunoSpan = document.getElementById("nomeAlunoModalInfo");
  const responsavelSpan = document.getElementById("responsavelModalInfo");

  if (nomeAlunoSpan) nomeAlunoSpan.textContent = aluno?.nome || "Novo cadastro";
  if (responsavelSpan) responsavelSpan.textContent = aluno?.responsavel?.nome || "Responsável";
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
    const matchVenc = !venc || item.vencimento.startsWith(venc);
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
            Editar
          </button>
          <button class="botao-acao" data-acao="pagar" data-id="${item.id}" title="Marcar pago" aria-label="Marcar mensalidade como paga">
            <svg class="icone-acao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
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
    if (el) el.value = value ?? "";
  };

  const idAluno = item?.idAluno ?? item?.id_aluno ?? "";

  setValue("campoIdMensalidade", item?.id);
  setValue("campoAlunoMensalidade", idAluno);
  setValue("campoValorMensalidade", item?.valor !== undefined && item?.valor !== null ? aplicarMascaraValorMensalidade(String(item.valor)) : "");
  setValue("campoVencimentoMensalidade", extrairDiaDeDataISO(item?.vencimento));
  // Status e data de pagamento não fazem mais parte deste formulário
  // (ver comentário em abrirModalNovo / mensalidade.html) — quem muda
  // isso é o botão "Marcar como paga" na listagem.

  const aluno = alunos.find((registro) => Number(registro.id_aluno) === Number(idAluno));
  const campoEscola = document.getElementById("campoEscolaMensalidade");
  const campoContato = document.getElementById("campoContatoMensalidade");
  const campoResponsavel = document.getElementById("campoResponsavelMensalidade");

  if (campoEscola) campoEscola.value = aluno?.escola?.nome || aluno?.escola || item?.escola || "";
  if (campoContato) campoContato.value = aplicarMascaraTelefoneMensalidade(aluno?.responsavel?.telefone || "");
  if (campoResponsavel) campoResponsavel.value = aplicarMascaraNomeMensalidade(aluno?.responsavel?.nome || item?.responsavel || "");

  const nomeAlunoSpan = document.getElementById("nomeAlunoModalInfo");
  const responsavelSpan = document.getElementById("responsavelModalInfo");

  if (nomeAlunoSpan) nomeAlunoSpan.textContent = item?.aluno || aluno?.nome || "Novo cadastro";
  if (responsavelSpan) responsavelSpan.textContent = item?.responsavel || aluno?.responsavel?.nome || "Responsável";
}

function abrirModalNova() {
  idEditando = null;
  const titulo = document.getElementById("tituloModalMensalidade");
  if (titulo) titulo.textContent = "Nova mensalidade";
  if (botaoSalvar) botaoSalvar.textContent = "Cadastrar";
  renderizarOpcoesAluno();
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
  renderizarOpcoesAluno();
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

async function fecharModalSeguroMensalidade() {
  if (typeof showConfirm !== "function") {
    fecharModal();
    return true;
  }

  const confirmacao = await showConfirm(
    "Deseja realmente fechar este formulário?",
    {
      confirmButtonText: "Fechar mesmo assim",
      cancelButtonText: "Continuar editando"
    }
  );

  if (confirmacao.isConfirmed) fecharModal();
  return confirmacao.isConfirmed;
}

function idAlunoPorNome(nomeAluno) {
  const aluno = alunos.find(
    (item) => item.nome?.trim().toLowerCase() === nomeAluno.trim().toLowerCase()
  );
  return aluno?.id_aluno || null;
}

async function salvarMensalidade() {
  const idAlunoSelecionado = document.getElementById("campoAlunoMensalidade")?.value || "";
  const valorTexto = document.getElementById("campoValorMensalidade")?.value || "";
  const valorNumerico = normalizarValorMensalidade(valorTexto);
  const diaVencimento = document.getElementById("campoVencimentoMensalidade")?.value || "";
  const mensalidadeEditando = mensalidades.find((item) => item.id === idEditando);
  const idAlunoFinal = idAlunoFluxo || Number(idAlunoSelecionado) || mensalidadeEditando?.idAluno || null;

  if (!idAlunoFinal) {
    showWarning("Selecione um aluno válido.");
    return;
  }

  if (!valorNumerico) {
    showWarning("Informe um valor da mensalidade maior que zero.");
    return;
  }

  if (!validarDiaVencimento(diaVencimento)) {
    showWarning("Informe um dia de vencimento válido, de 1 a 31.");
    return;
  }

  /*
    Ao EDITAR: mantém o mês/ano originais da mensalidade e só troca o
    dia (senão editar o dia de uma mensalidade de um mês passado a
    empurraria para o mês atual). Ao CRIAR: usa o mês/ano atuais, já
    que é uma mensalidade nova sendo gerada agora.
  */
  const referenciaMesAno = mensalidadeEditando?.vencimento
    ? new Date(`${mensalidadeEditando.vencimento}T12:00:00`)
    : new Date();
  const vencimento = montarDataVencimento(diaVencimento, referenciaMesAno);

  /*
    REMOVIDO: status e data de pagamento não fazem mais parte deste
    formulário. Toda mensalidade nova é criada como PENDENTE (o
    backend garante isso independente do que for enviado — ver
    service_mensalidade.ts). Ao editar, como esses dois campos não
    entram no payload, o backend simplesmente não mexe neles (só
    atualiza o que veio no corpo da requisição); mudar para PAGO
    continua sendo feito só pelo botão "Marcar como paga" da listagem.
  */
  const payload = {
    id_aluno: Number(idAlunoFinal),
    valor: valorNumerico,
    data_vencimento: vencimento,
  };

  try {
    if (idEditando) {
      await window.API.put(`/mensalidades/${idEditando}`, payload);
      await showSuccess("Mensalidade atualizada com sucesso!");
    } else {
      await window.API.post("/mensalidades", payload);

      if (emFluxoCadastro()) {
        await proximoPassoFluxo();
        return;
      }

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
   EVENTOS DOS BOTÕES
   ========================================================= */

function configurarBotoes() {
  if (botaoCancelar) botaoCancelar.addEventListener("click", fecharModalSeguroMensalidade);
  if (botaoFecharTopo) botaoFecharTopo.addEventListener("click", fecharModalSeguroMensalidade);

  const campoAluno = document.getElementById("campoAlunoMensalidade");
  const campoValor = document.getElementById("campoValorMensalidade");

  if (campoAluno) {
    campoAluno.addEventListener("change", preencherDadosAlunoSelecionado);
  }

  if (campoValor) {
    campoValor.addEventListener("input", (event) => {
      const valorMascara = aplicarMascaraValorMensalidade(event.target.value);
      if (valorMascara !== event.target.value) {
        event.target.value = valorMascara;
      }
    });
  }

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", async () => {
      await salvarMensalidade();
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
    renderizarOpcoesAluno();
    atualizarOpcoesEscola();
    renderizarTabela();
    atualizarResumo();
    configurarBotoes();
    configurarEventosTabela();
    await iniciarFluxoCadastro();
    abrirMensalidadeDaNotificacao();
  } catch (error) {
    console.error(error);
    showError("Não foi possível carregar as mensalidades.");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && fundoModal?.classList.contains("ativo")) {
    fecharModalSeguroMensalidade();
  }
});


function abrirMensalidadeDaNotificacao() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("notificacao_mensalidade"));

  if (!id) return;

  const mensalidade = mensalidades.find((item) => Number(item.id) === id);

  if (!mensalidade) {
    console.warn("[mensalidade] Mensalidade da notificação não encontrada:", id);
    return;
  }

  abrirModalEditar(id);

  params.delete("notificacao_mensalidade");
  const novaQuery = params.toString();
  const novaUrl =
    window.location.pathname +
    (novaQuery ? `?${novaQuery}` : "");

  window.history.replaceState({}, document.title, novaUrl);
}
