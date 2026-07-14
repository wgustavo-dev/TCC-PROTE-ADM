import { initMenu } from '../core/menu.js';

initMenu();

let responsaveis = [];
let filtroBusca = '';
let filtroStatus = 'todos';
let filtroOrdem = 'alfabetica';
let idEmEdicao = null;
let detalheAbertoId = null;
let linhaDetalhesAtual = null;

let fluxoCadastro = 'manual';
let idOrcamentoFluxo = null;
let orcamentoFluxo = null;

const tbody = document.getElementById('tbodyResponsaveis');
const emptyState = document.getElementById('emptyState');
const painelDetalhes = document.getElementById('painelDetalhes');
const inputBusca = document.getElementById('inputBusca');
const selectStatus = document.getElementById('filtroStatus');
const selectOrdem = document.getElementById('filtroOrdem');
const botaoFiltro = document.getElementById('botaoFiltro');
const painelFiltros = document.getElementById('painelFiltros');
const btnLimparFiltros = document.getElementById('btnLimparFiltros');
const modalOverlay = document.getElementById('modalOverlay');
const form = document.getElementById('formResponsavel');

const camposForm = {
  nome: document.getElementById('nome'),
  quantidade: document.getElementById('quantidade'),
  email: document.getElementById('email'),
  telefone: document.getElementById('telefone'),
  endereco: document.getElementById('endereco')
};

function aplicarMascaraTelefone(valor) {
  const numeros = String(valor || '').replace(/\D/g, '').slice(0, 11);

  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function limparMascaraTelefone(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function formatarMoeda(valor) {
  const numero = Number(valor || 0);

  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarData(data) {
  if (!data) return '-';

  const dataObj = new Date(`${String(data).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(dataObj.getTime())) return '-';

  return dataObj.toLocaleDateString('pt-BR');
}

function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return (partes[0]?.[0] || 'S') + (partes[1]?.[0] || 'N');
}

function obterParametrosFluxo() {
  const params = new URLSearchParams(window.location.search);

  fluxoCadastro = params.get('fluxo') || 'manual';
  idOrcamentoFluxo = params.get('id_orcamento');

  if (fluxoCadastro !== 'orcamento') {
    fluxoCadastro = 'manual';
    idOrcamentoFluxo = null;
  }
}

function normalizarResponsavel(item) {
  return {
    id: item.id_responsavel,
    nome: item.nome || '',
    quantidade: Number(item.quantidade_alunos || 0),
    telefone: aplicarMascaraTelefone(item.telefone || ''),
    email: item.email || '',
    endereco: item.endereco || '',
    mensalidade: formatarMoeda(item.mensalidade_total || 0),
    status: item.status_financeiro || 'em_dia',
    vencimento: formatarData(item.proximo_vencimento),
    alunos: Array.isArray(item.alunos)
      ? item.alunos.map((aluno) => ({
          nome: aluno.nome || 'Aluno',
          valor: `R$ ${formatarMoeda(aluno.mensalidade || 0)}`
        }))
      : []
  };
}

async function carregarResponsaveis() {
  const dados = await window.API.get('/responsaveis');
  responsaveis = Array.isArray(dados) ? dados.map(normalizarResponsavel) : [];
  renderTabela();
}

async function carregarOrcamentoDoFluxo() {
  if (fluxoCadastro !== 'orcamento' || !idOrcamentoFluxo) return;

  try {
    const orcamento = await window.API.get(`/orcamentos/${idOrcamentoFluxo}`);
    orcamentoFluxo = orcamento;

    abrirModal(false, null, true);

    camposForm.nome.value = orcamento.nome_responsavel || '';
    camposForm.telefone.value = aplicarMascaraTelefone(orcamento.telefone || '');
    camposForm.email.value = '';
    camposForm.quantidade.value = Number(orcamento.quantidade_alunos || 1);

    /*
      O orçamento não possui campo específico de endereço do responsável.
      Por enquanto, usamos o endereço de embarque como sugestão.
      O usuário pode revisar e alterar antes de salvar.
    */
    camposForm.endereco.value = orcamento.endereco_embarque || '';

    document.getElementById('avatarModal').textContent =
      iniciais(camposForm.nome.value);
  } catch (error) {
    showError(error.message || 'Não foi possível carregar o orçamento para revisão.');
  }
}

function listaFiltrada() {
  const busca = filtroBusca.toLowerCase();

  const lista = responsaveis.filter((r) => {
    const okBusca =
      r.nome.toLowerCase().includes(busca) ||
      r.email.toLowerCase().includes(busca) ||
      r.telefone.toLowerCase().includes(busca);

    const okStatus =
      filtroStatus === 'todos' ||
      (filtroStatus === 'maior_3'
        ? r.quantidade >= 3
        : r.status === filtroStatus);

    return okBusca && okStatus;
  });

  if (filtroOrdem === 'alfabetica') {
    return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  if (filtroOrdem === 'alunos_desc') {
    return lista.sort((a, b) => b.quantidade - a.quantidade);
  }

  if (filtroOrdem === 'alunos_asc') {
    return lista.sort((a, b) => a.quantidade - b.quantidade);
  }

  return lista;
}

function removerLinhaDetalhes() {
  if (linhaDetalhesAtual) {
    linhaDetalhesAtual.remove();
    linhaDetalhesAtual = null;
  }

  painelDetalhes.classList.add('hidden');
  document.querySelector('.main')?.appendChild(painelDetalhes);
}

function renderTabela() {
  detalheAbertoId = null;
  removerLinhaDetalhes();

  const dados = listaFiltrada();

  tbody.innerHTML = dados.map((r) => `
    <tr>
      <td>${r.nome}</td>
      <td>${r.quantidade}</td>
      <td>${r.telefone}<br>${r.email || '-'}</td>
      <td>R$ ${r.mensalidade}</td>
      <td>
        <div class="acoes">
          <button class="acao-btn ver" data-ac="ver" data-id="${r.id}" title="Ver detalhes" aria-label="Ver detalhes">
            ▾
          </button>

          <button class="acao-btn" data-ac="editar" data-id="${r.id}" title="Editar" aria-label="Editar responsável">
            <svg class="icone-acao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
            </svg>
          </button>

          <button class="acao-btn excluir" data-ac="excluir" data-id="${r.id}" title="Excluir" aria-label="Excluir responsável">
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
    </tr>
  `).join('');

  emptyState.classList.toggle('hidden', dados.length > 0);
}

function abrirDetalhes(id, linhaClicada) {
  const r = responsaveis.find((x) => x.id === id);
  if (!r) return;

  if (detalheAbertoId === id) {
    detalheAbertoId = null;
    removerLinhaDetalhes();
    return;
  }

  document.getElementById('detNomeTopo').textContent = r.nome.toUpperCase();
  document.getElementById('detAvatar').textContent = iniciais(r.nome);
  document.getElementById('detTelefone').textContent = r.telefone || '-';
  document.getElementById('detEmail').textContent = r.email || '-';
  document.getElementById('detQtdAlunos').textContent = String(r.quantidade);
  document.getElementById('detTotal').textContent = `R$ ${r.mensalidade}`;
  document.getElementById('detVencimento').textContent = r.vencimento;
  document.getElementById('detSituacao').textContent =
    r.status === 'em_dia' ? 'Em dia' : 'Atrasado';

  document.getElementById('detAlunos').innerHTML = r.alunos.length
    ? r.alunos.map((a) => `
        <div class="aluno-card">
          <strong>${a.nome}</strong>
          <p>${a.valor}</p>
        </div>
      `).join('')
    : `
        <div class="aluno-card">
          <strong>Nenhum aluno vinculado</strong>
          <p>R$ 0,00</p>
        </div>
      `;

  detalheAbertoId = id;
  removerLinhaDetalhes();

  linhaDetalhesAtual = document.createElement('tr');
  linhaDetalhesAtual.className = 'linha-detalhes-responsavel';
  linhaDetalhesAtual.innerHTML = '<td colspan="5"></td>';
  linhaDetalhesAtual.querySelector('td').appendChild(painelDetalhes);

  linhaClicada.insertAdjacentElement('afterend', linhaDetalhesAtual);
  painelDetalhes.classList.remove('hidden');
}

function abrirModal(edicao = false, item = null, vindoDeOrcamento = false) {
  idEmEdicao = item?.id || null;

  document.getElementById('modalTitulo').textContent =
    edicao ? 'Editar responsável' : 'Novo responsável';

  document.getElementById('btnSalvar').textContent =
    edicao ? 'Editar' : 'Salvar';

  form.reset();

  if (item) {
    camposForm.nome.value = item.nome;
    camposForm.quantidade.value = item.quantidade || 1;
    camposForm.email.value = item.email;
    camposForm.telefone.value = item.telefone;
    camposForm.endereco.value = item.endereco || '';
    document.getElementById('avatarModal').textContent = iniciais(item.nome);
  } else {
    camposForm.quantidade.value = vindoDeOrcamento ? '' : 1;
    document.getElementById('avatarModal').textContent = 'SN';
  }

  modalOverlay.classList.remove('hidden');
  registrarEstadoInicialFormulario(form);
}

function obterQuantidadeAlunos() {
  const quantidade = Number(camposForm.quantidade.value);

  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return null;
  }

  return quantidade;
}

function montarPayload() {
  return {
    nome: camposForm.nome.value.trim(),
    email: camposForm.email.value.trim() || null,
    telefone: limparMascaraTelefone(camposForm.telefone.value),
    endereco: camposForm.endereco.value.trim(),
    quantidade_alunos: obterQuantidadeAlunos()
  };
}

function redirecionarParaAluno(responsavelSalvo, totalAlunos) {
  const idResponsavel = responsavelSalvo.id_responsavel;

  if (!idResponsavel) {
    showError('Responsável salvo, mas o ID não foi retornado pelo backend.');
    return;
  }

  const params = new URLSearchParams();

  params.set('fluxo', fluxoCadastro);
  params.set('id_responsavel', String(idResponsavel));
  params.set('alunoAtual', '1');
  params.set('totalAlunos', String(totalAlunos));

  if (fluxoCadastro === 'orcamento' && idOrcamentoFluxo) {
    params.set('id_orcamento', String(idOrcamentoFluxo));
  }

  window.location.href = `alunos.html?${params.toString()}`;
}

async function salvarFormulario(e) {
  e.preventDefault();

  const payload = montarPayload();

  if (!payload.nome || !payload.telefone || !payload.endereco) {
    showError('Preencha nome, telefone e endereço.');
    return;
  }

  if (!payload.quantidade_alunos) {
    showError('Informe a quantidade de alunos.');
    return;
  }

  try {
    if (idEmEdicao) {
      await window.API.put(`/responsaveis/${idEmEdicao}`, payload);

      modalOverlay.classList.add('hidden');
      await carregarResponsaveis();

      showSuccess('Responsável atualizado com sucesso.');
      return;
    }

    const responsavelSalvo = await window.API.post('/responsaveis', payload);

    modalOverlay.classList.add('hidden');

    redirecionarParaAluno(responsavelSalvo, payload.quantidade_alunos);
  } catch (error) {
    showError(error.message || 'Não foi possível salvar o responsável.');
  }
}

async function confirmarExclusao(nome) {
  const resultado = await showConfirm(`Tem certeza que deseja excluir ${nome || 'este responsável'}?`, {
    title: 'Excluir responsável?',
    confirmButtonText: 'Sim, excluir',
    cancelButtonText: 'Cancelar'
  });

  return resultado.isConfirmed;
}

async function excluirResponsavel(id) {
  const responsavel = responsaveis.find((r) => r.id === id);
  const confirmado = await confirmarExclusao(responsavel?.nome);

  if (!confirmado) return;

  try {
    await window.API.del(`/responsaveis/${id}`);

    detalheAbertoId = null;
    removerLinhaDetalhes();

    await carregarResponsaveis();

    showSuccess('Responsável excluído com sucesso.');
  } catch (error) {
    showError(error.message || 'Não foi possível excluir o responsável.');
  }
}

inputBusca.addEventListener('input', (e) => {
  filtroBusca = e.target.value.toLowerCase();
  renderTabela();
});

selectStatus.addEventListener('change', (e) => {
  filtroStatus = e.target.value;
  renderTabela();
});

if (selectOrdem) {
  selectOrdem.addEventListener('change', (e) => {
    filtroOrdem = e.target.value;
    renderTabela();
  });
}

if (botaoFiltro && painelFiltros) {
  botaoFiltro.addEventListener('click', () => {
    painelFiltros.classList.toggle('hidden');
    botaoFiltro.classList.toggle('aberto');
  });
}

if (btnLimparFiltros) {
  btnLimparFiltros.addEventListener('click', () => {
    filtroStatus = 'todos';
    filtroOrdem = 'alfabetica';
    filtroBusca = '';

    if (inputBusca) inputBusca.value = '';
    if (selectStatus) selectStatus.value = 'todos';
    if (selectOrdem) selectOrdem.value = 'alfabetica';

    renderTabela();
  });
}

function fecharModalResponsavel() {
  modalOverlay.classList.add('hidden');
}

document.getElementById('btnCancelar').addEventListener('click', () => fecharModalSeguro(form, fecharModalResponsavel));

const btnCloseModal = document.getElementById('btnCancelarModal');

if (btnCloseModal) {
  btnCloseModal.addEventListener('click', () => fecharModalSeguro(form, fecharModalResponsavel));
}

document.getElementById('btnFecharDetalhes').addEventListener('click', () => {
  detalheAbertoId = null;
  removerLinhaDetalhes();
});

camposForm.nome.addEventListener('input', () => {
  document.getElementById('avatarModal').textContent =
    iniciais(camposForm.nome.value);
});

camposForm.telefone.addEventListener('input', () => {
  camposForm.telefone.value = aplicarMascaraTelefone(camposForm.telefone.value);
});

form.addEventListener('submit', salvarFormulario);

tbody.addEventListener('click', (e) => {
  const botao = e.target.closest('[data-ac]');

  if (!botao) return;

  const id = Number(botao.dataset.id);
  const acao = botao.dataset.ac;
  const item = responsaveis.find((r) => r.id === id);

  if (acao === 'ver') {
    abrirDetalhes(id, botao.closest('tr'));
  }

  if (acao === 'editar' && item) {
    abrirModal(true, item);
  }

  if (acao === 'excluir') {
    excluirResponsavel(id);
  }
});

obterParametrosFluxo();

carregarResponsaveis()
  .then(() => carregarOrcamentoDoFluxo())
  .catch((error) => {
    showError(error.message || 'Não foi possível carregar os responsáveis.');
    responsaveis = [];
    renderTabela();
  });

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
    fecharModalSeguro(form, fecharModalResponsavel);
  }
});
