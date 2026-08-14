import { initMenu } from '../core/menu.js';

initMenu();

let escolas = [];
let filtroBusca = '';
let filtroOrdem = 'alfabetica';
let idEmEdicao = null;

const tbody = document.getElementById('tbodyEscolas');
const emptyState = document.getElementById('emptyState');
const inputBusca = document.getElementById('inputBusca');
const selectOrdem = document.getElementById('filtroOrdem');
const botaoFiltro = document.getElementById('botaoFiltro');
const painelFiltros = document.getElementById('painelFiltros');
const btnLimparFiltros = document.getElementById('btnLimparFiltros');
const modalOverlay = document.getElementById('modalOverlay');
const form = document.getElementById('formEscola');
const btnNovaEscola = document.getElementById('btnNovaEscola');

const camposForm = {
  nome: document.getElementById('nome'),
  endereco: document.getElementById('endereco'),
  alunos: document.getElementById('alunosCampo')
};

function normalizarEscola(item) {
  return {
    id: item.id_escola,
    nome: item.nome || '',
    endereco: item.endereco || '',
    quantidade: Number(item.quantidade_alunos || 0)
  };
}

async function carregarEscolas() {
  const dados = await window.API.get('/escolas');
  escolas = Array.isArray(dados) ? dados.map(normalizarEscola) : [];
  renderTabela();
}

function listaFiltrada() {
  const busca = filtroBusca.toLowerCase();

  const lista = escolas.filter((e) =>
    e.nome.toLowerCase().includes(busca) ||
    e.endereco.toLowerCase().includes(busca)
  );

  if (filtroOrdem === 'alunos_desc') {
    return lista.sort((a, b) => b.quantidade - a.quantidade);
  }

  if (filtroOrdem === 'alunos_asc') {
    return lista.sort((a, b) => a.quantidade - b.quantidade);
  }

  return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function renderTabela() {
  const dados = listaFiltrada();

  tbody.innerHTML = dados.map((e) => `
    <tr>
      <td>${e.nome}</td>
      <td>${e.endereco || '-'}</td>
      <td>${e.quantidade}</td>
      <td>
        <div class="acoes">
          <button class="acao-btn" data-ac="editar" data-id="${e.id}" title="Editar" aria-label="Editar escola">
            <svg class="icone-acao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
            </svg>
          </button>

          <button class="acao-btn excluir" data-ac="excluir" data-id="${e.id}" title="Excluir" aria-label="Excluir escola">
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

function abrirModal(edicao = false, item = null) {
  idEmEdicao = item?.id || null;

  document.getElementById('modalTitulo').textContent =
    edicao ? 'Editar escola' : 'Nova escola';

  document.getElementById('btnSalvar').textContent =
    edicao ? 'Editar' : 'Cadastrar';

  form.reset();

  if (item) {
    camposForm.nome.value = item.nome;
    camposForm.endereco.value = item.endereco || '';
    camposForm.alunos.value = String(item.quantidade);
  } else {
    camposForm.alunos.value = '0';
  }

  modalOverlay.classList.remove('hidden');
  registrarEstadoInicialFormulario(form);
}

function montarPayload() {
  return {
    nome: camposForm.nome.value.trim(),
    endereco: camposForm.endereco.value.trim()
  };
}

async function salvarFormulario(e) {
  e.preventDefault();

  const payload = montarPayload();

  if (!payload.nome || !payload.endereco) {
    showError('Preencha o nome e o endereço da escola.');
    return;
  }

  try {
    if (idEmEdicao) {
      await window.API.put(`/escolas/${idEmEdicao}`, payload);
      showSuccess('Escola atualizada com sucesso.');
    } else {
      await window.API.post('/escolas', payload);
      showSuccess('Escola cadastrada com sucesso.');
    }

    modalOverlay.classList.add('hidden');
    await carregarEscolas();
  } catch (error) {
    showError(error.message || 'Não foi possível salvar a escola.');
  }
}

async function confirmarExclusao(nome) {
  const resultado = await showConfirm(`Tem certeza que deseja excluir ${nome || 'esta escola'}?`, {
    title: 'Excluir escola?',
    confirmButtonText: 'Sim, excluir',
    cancelButtonText: 'Cancelar'
  });

  return resultado.isConfirmed;
}

async function excluirEscola(id) {
  const escola = escolas.find((e) => e.id === id);
  const confirmado = await confirmarExclusao(escola?.nome);

  if (!confirmado) return;

  try {
    await window.API.del(`/escolas/${id}`);
    await carregarEscolas();
    showSuccess('Escola excluída com sucesso.');
  } catch (error) {
    showError(error.message || 'Não foi possível excluir a escola.');
  }
}

inputBusca.addEventListener('input', (e) => {
  filtroBusca = e.target.value.toLowerCase();
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
    filtroOrdem = 'alfabetica';
    filtroBusca = '';

    if (inputBusca) inputBusca.value = '';
    if (selectOrdem) selectOrdem.value = 'alfabetica';

    renderTabela();
  });
}

function fecharModalEscola() {
  modalOverlay.classList.add('hidden');
}

if (btnNovaEscola) {
  btnNovaEscola.addEventListener('click', () => abrirModal(false));
}

document.getElementById('btnCancelar').addEventListener('click', () => fecharModalSeguro(form, fecharModalEscola));

const btnCloseModal = document.getElementById('btnCancelarModal');

if (btnCloseModal) {
  btnCloseModal.addEventListener('click', () => fecharModalSeguro(form, fecharModalEscola));
}

form.addEventListener('submit', salvarFormulario);

tbody.addEventListener('click', (e) => {
  const botao = e.target.closest('[data-ac]');

  if (!botao) return;

  const id = Number(botao.dataset.id);
  const acao = botao.dataset.ac;
  const item = escolas.find((x) => x.id === id);

  if (acao === 'editar' && item) {
    abrirModal(true, item);
  }

  if (acao === 'excluir') {
    excluirEscola(id);
  }
});

carregarEscolas().catch((error) => {
  showError(error.message || 'Não foi possível carregar as escolas.');
  escolas = [];
  renderTabela();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
    fecharModalSeguro(form, fecharModalEscola);
  }
});
