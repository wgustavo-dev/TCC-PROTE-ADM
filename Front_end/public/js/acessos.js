import { initMenu } from '../core/menu.js';

initMenu();

let acessos = [];
let buscaAtual = '';
let filtroAtual = 'todos';
let idEditando = null; // { id, tipo } do item em edição, ou null ao criar

const tbody = document.getElementById('tbodyAcessos');
const emptyState = document.getElementById('emptyStateAcessos');
const inputBusca = document.getElementById('inputBuscaAcesso');
const filtroAcesso = document.getElementById('filtroAcesso');
const btnNovo = document.getElementById('btnNovoAcesso');
const modalOverlay = document.getElementById('modalAcessoOverlay');
const modalTitulo = document.getElementById('modalTituloAcesso');
const form = document.getElementById('formAcesso');
const btnCancelar = document.getElementById('btnCancelarAcesso');
const btnSalvar = document.getElementById('btnSalvarAcesso');

const campos = {
  id: document.getElementById('acessoId'),
  nome: document.getElementById('nomeAcesso'),
  acesso: document.getElementById('tipoAcesso'),
  email: document.getElementById('emailAcesso'),
  telefone: document.getElementById('telefoneAcesso'),
  senha: document.getElementById('senhaAcesso'),
  confirmarSenha: document.getElementById('confirmarSenhaAcesso')
};

const labelSenha = document.getElementById('labelSenhaAcesso');
const labelConfirmarSenha = document.getElementById('labelConfirmarSenhaAcesso');

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

function normalizarEmail(valor) {
  return String(valor || '').trim().toLowerCase().replace(/\s+/g, '');
}

function validarEmail(valor) {
  const email = normalizarEmail(valor);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escaparHTML(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// O backend retorna "tipo" (condutor|monitor), necessário para montar
// as rotas PUT/DELETE /acessos/:tipo/:id. Mantemos "acesso" (Condutor|
// Monitor) só para exibição/filtro, igual ao <select> de filtro.
function normalizarAcesso(item) {
  const tipo = String(item.tipo || (item.acesso === 'Monitor' ? 'monitor' : 'condutor')).toLowerCase();

  return {
    id: Number(item.id),
    tipo,
    nome: item.nome || '',
    acesso: item.acesso || (tipo === 'monitor' ? 'Monitor' : 'Condutor'),
    email: item.email || '',
    telefone: aplicarMascaraTelefone(item.telefone || '')
  };
}

async function carregarAcessos() {
  try {
    const dados = await window.API.get('/acessos');
    acessos = Array.isArray(dados) ? dados.map(normalizarAcesso) : [];
  } catch (error) {
    acessos = [];
    showError(error.message || 'Não foi possível carregar os acessos.');
  }

  renderTabela();
}

function listaFiltrada() {
  const busca = buscaAtual.trim().toLowerCase();

  return acessos
    .filter((item) => {
      const texto = `${item.nome} ${item.acesso} ${item.email} ${item.telefone}`.toLowerCase();
      const passouBusca = !busca || texto.includes(busca);
      const passouFiltro = filtroAtual === 'todos' || item.acesso === filtroAtual;

      return passouBusca && passouFiltro;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function renderTabela() {
  const dados = listaFiltrada();

  tbody.innerHTML = dados.map((item) => `
    <tr>
      <td>${escaparHTML(item.nome)}</td>
      <td><span class="badge-acesso ${item.tipo === 'monitor' ? 'badge-monitor' : 'badge-condutor'}">${escaparHTML(item.acesso)}</span></td>
      <td>${escaparHTML(item.telefone)}<br>${escaparHTML(item.email)}</td>
      <td>
        <div class="acoes-acesso">
          <button class="btn-acao-acesso editar" type="button" data-acao="editar" data-id="${item.id}" data-tipo="${item.tipo}" title="Editar" aria-label="Editar acesso">
            Editar
          </button>

          <button class="btn-acao-acesso excluir" type="button" data-acao="excluir" data-id="${item.id}" data-tipo="${item.tipo}" title="Excluir" aria-label="Excluir acesso">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

function abrirModal(editando = false, acesso = null) {
  idEditando = editando && acesso ? { id: acesso.id, tipo: acesso.tipo } : null;

  modalTitulo.textContent = editando ? 'Editar acesso' : 'Novo acesso';
  btnSalvar.textContent = editando ? 'Editar' : 'Cadastrar';

  campos.id.value = acesso?.id || '';
  campos.nome.value = acesso?.nome || '';
  campos.acesso.value = acesso?.acesso || '';
  campos.email.value = acesso?.email || '';
  campos.telefone.value = acesso?.telefone || '';
  campos.senha.value = '';
  campos.confirmarSenha.value = '';

  // NOVA REGRA DE NEGÓCIO: o tipo de acesso agora PODE ser alterado
  // durante a edição (Condutor <-> Monitor). O <select> deixou de ser
  // desabilitado ao editar. O backend detecta a troca comparando o
  // tipo original (guardado em idEditando.tipo) com o valor enviado
  // no campo "acesso", e faz a conversão automaticamente.

  // Ao criar, a senha é obrigatória. Ao editar, deixar em branco
  // mantém a senha atual do usuário (inclusive quando o tipo é
  // convertido: a senha atual é levada para o novo registro).
  campos.senha.required = !editando;
  campos.confirmarSenha.required = !editando;
  labelSenha.textContent = editando ? 'Senha (deixe em branco para manter a atual)' : 'Senha';
  labelConfirmarSenha.textContent = editando ? 'Confirmar nova senha' : 'Confirmar senha';

  modalOverlay.classList.remove('hidden');
  registrarEstadoInicialFormulario(form);

  setTimeout(() => campos.nome.focus(), 80);
}

function fecharModal() {
  modalOverlay.classList.add('hidden');
  form.reset();
  idEditando = null;
}

function montarPayload() {
  const payload = {
    nome: campos.nome.value.trim(),
    acesso: campos.acesso.value,
    email: normalizarEmail(campos.email.value),
    telefone: limparMascaraTelefone(campos.telefone.value)
  };

  // Só envia a senha quando o usuário digitou algo. Isso permite
  // editar um acesso sem ser obrigado a trocar a senha.
  if (campos.senha.value) {
    payload.senha = campos.senha.value;
  }

  return payload;
}

function validarPayload(payload) {
  if (!payload.nome) return 'Preencha o nome.';
  if (!payload.acesso) return 'Selecione o tipo de acesso.';
  if (!payload.email) return 'Preencha o email.';
  if (!validarEmail(payload.email)) return 'Informe um e-mail válido.';
  if (!payload.telefone || payload.telefone.length < 10) return 'Preencha um telefone válido.';

  const precisaSenha = !idEditando;

  if (precisaSenha && !campos.senha.value) {
    return 'Preencha a senha.';
  }

  if (campos.senha.value && campos.senha.value.length < 6) {
    return 'A senha deve ter no mínimo 6 caracteres.';
  }

  if (campos.senha.value !== campos.confirmarSenha.value) {
    return 'As senhas não coincidem.';
  }

  return null;
}

// Está convertendo o nível de acesso quando: já existe um item em
// edição E o tipo escolhido no <select> é diferente do tipo original
// do registro (idEditando.tipo).
function estaConvertendoTipo(payload) {
  if (!idEditando) return false;

  const tipoDestino = payload.acesso.toLowerCase() === 'monitor' ? 'monitor' : 'condutor';

  return tipoDestino !== idEditando.tipo;
}

async function salvarAcesso(event) {
  event.preventDefault();

  const payload = montarPayload();
  const erro = validarPayload(payload);

  if (erro) {
    showError(erro);
    return;
  }

  if (estaConvertendoTipo(payload)) {
    const confirmado = await showConfirm(
      `Isso vai desativar o cadastro atual e criar um novo registro como "${payload.acesso}". Deseja continuar?`,
      { title: 'Trocar nível de acesso' }
    );

    if (!confirmado.isConfirmed) return;
  }

  try {
    if (idEditando) {
      await window.API.put(`/acessos/${idEditando.tipo}/${idEditando.id}`, payload);
    } else {
      await window.API.post('/acessos', payload);
    }

    await carregarAcessos();

    showSuccess(idEditando ? 'Acesso editado com sucesso.' : 'Acesso cadastrado com sucesso.');
    fecharModal();
  } catch (error) {
    showError(error.message || 'Não foi possível salvar o acesso.');
  }
}

async function excluirAcesso(item) {
  const confirmado = await showConfirm('Deseja excluir este acesso?');
  if (!confirmado.isConfirmed) return;

  try {
    await window.API.del(`/acessos/${item.tipo}/${item.id}`);
    await carregarAcessos();

    showSuccess('Acesso excluído com sucesso.');
  } catch (error) {
    showError(error.message || 'Não foi possível excluir o acesso.');
  }
}

btnNovo.addEventListener('click', () => abrirModal(false));
btnCancelar.addEventListener('click', () => fecharModalSeguro(form, fecharModal));

modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) fecharModalSeguro(form, fecharModal);
});

form.addEventListener('submit', salvarAcesso);

inputBusca.addEventListener('input', (event) => {
  buscaAtual = event.target.value;
  renderTabela();
});

filtroAcesso.addEventListener('change', (event) => {
  filtroAtual = event.target.value;
  renderTabela();
});

campos.telefone.addEventListener('input', (event) => {
  event.target.value = aplicarMascaraTelefone(event.target.value);
});

campos.email.addEventListener('input', (event) => {
  event.target.value = normalizarEmail(event.target.value);
});

tbody.addEventListener('click', (event) => {
  const botao = event.target.closest('[data-acao]');
  if (!botao) return;

  const id = Number(botao.dataset.id);
  const tipo = botao.dataset.tipo;
  const acesso = acessos.find((item) => item.id === id && item.tipo === tipo);

  if (!acesso) return;

  if (botao.dataset.acao === 'editar') {
    abrirModal(true, acesso);
  }

  if (botao.dataset.acao === 'excluir') {
    excluirAcesso(acesso);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
    fecharModalSeguro(form, fecharModal);
  }
});

carregarAcessos();
