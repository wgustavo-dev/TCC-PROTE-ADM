import { initMenu } from '../core/menu.js';

initMenu();

const STORAGE_KEY = 'prote_acessos';

let acessos = [];
let buscaAtual = '';
let filtroAtual = 'todos';
let idEditando = null;
let usandoApi = true;

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
  confirmarSenha: document.getElementById('confirmarSenhaAcesso'),
  condutorResponsavel: document.getElementById('condutorResponsavel')
};

const grupoCondutor = document.getElementById('grupoCondutorResponsavel');

function carregarCondutores() {
  const condutores = acessos.filter((item) => item.acesso === 'Condutor');
  campos.condutorResponsavel.innerHTML = '<option value="">Selecione...</option>';
  condutores.forEach((condutor) => {
    campos.condutorResponsavel.innerHTML += `<option value="${condutor.id}">${condutor.nome}</option>`;
  });
}

function dadosIniciais() {
  return [
    {
      id: 1,
      nome: 'Gabriel Soares',
      acesso: 'Condutor',
      email: 'gabriel@gmail.com',
      telefone: '(11) 99999-9999'
    },
    {
      id: 2,
      nome: 'Eduarda Souza',
      acesso: 'Monitor',
      email: 'eduarda@gmail.com',
      telefone: '(11) 99999-9999'
    }
  ];
}

function showError(message) {
  if (window.Swal) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: message,
      confirmButtonText: 'OK'
    });
    return;
  }

  alert(message);
}

function showSuccess(message) {
  if (window.Swal) {
    Swal.fire({
      icon: 'success',
      title: 'Sucesso',
      text: message,
      timer: 1300,
      showConfirmButton: false
    });
    return;
  }

  alert(message);
}

async function showConfirm(message) {
  if (window.Swal) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Confirmar ação',
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar'
    });

    return result.isConfirmed;
  }

  return confirm(message);
}

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

function escaparHTML(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizarAcesso(item) {
  return {
    id: Number(item.id_acesso || item.id || Date.now()),
    nome: item.nome || '',
    acesso: item.acesso || item.tipo_acesso || '',
    email: item.email || '',
    telefone: aplicarMascaraTelefone(item.telefone || '')
  };
}

function salvarLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acessos));
}

function carregarLocal() {
  const salvo = localStorage.getItem(STORAGE_KEY);

  if (!salvo) {
    acessos = dadosIniciais();
    salvarLocal();
    return;
  }

  try {
    const lista = JSON.parse(salvo);
    acessos = Array.isArray(lista) ? lista.map(normalizarAcesso) : dadosIniciais();
  } catch {
    acessos = dadosIniciais();
  }
}

async function carregarAcessos() {
  try {
    const dados = await window.API.get('/acessos');
    acessos = Array.isArray(dados) ? dados.map(normalizarAcesso) : [];
    usandoApi = true;
  } catch (error) {
    usandoApi = false;
    carregarLocal();
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
    .sort((a, b) => a.id - b.id);
}

function renderTabela() {
  const dados = listaFiltrada();

  tbody.innerHTML = dados.map((item) => `
    <tr>
      <td>${escaparHTML(item.id)}</td>
      <td>${escaparHTML(item.nome)}</td>
      <td>${escaparHTML(item.acesso)}</td>
      <td>${escaparHTML(item.telefone)}<br>${escaparHTML(item.email)}</td>
      <td>
        <div class="acoes-acesso">
          <button class="btn-acao-acesso editar" type="button" data-acao="editar" data-id="${item.id}" title="Editar" aria-label="Editar acesso">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
            </svg>
          </button>

          <button class="btn-acao-acesso excluir" type="button" data-acao="excluir" data-id="${item.id}" title="Excluir" aria-label="Excluir acesso">
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
  idEditando = editando && acesso ? acesso.id : null;

  modalTitulo.textContent = editando ? 'Editar acesso' : 'Novo acesso';
  btnSalvar.textContent = editando ? 'Editar' : 'Cadastrar';

  campos.id.value = acesso?.id || '';
  campos.nome.value = acesso?.nome || '';
  campos.acesso.value = acesso?.acesso || '';
  campos.email.value = acesso?.email || '';
  campos.telefone.value = acesso?.telefone || '';

  modalOverlay.classList.remove('hidden');

  setTimeout(() => campos.nome.focus(), 80);
}

function fecharModal() {
  modalOverlay.classList.add('hidden');
  form.reset();
  idEditando = null;
}

function montarPayload() {
  return {
    nome: campos.nome.value.trim(),
    acesso: campos.acesso.value,
    email: campos.email.value.trim(),
    telefone: limparMascaraTelefone(campos.telefone.value)
  };
}

function validarPayload(payload) {
  if (!payload.nome) return 'Preencha o nome.';
  if (!payload.acesso) return 'Selecione o tipo de acesso.';
  if (!payload.email) return 'Preencha o email.';
  if (!payload.telefone || payload.telefone.length < 10) return 'Preencha um telefone válido.';

  if (payload.acesso === 'Monitor' && !campos.condutorResponsavel.value) {
    return 'Selecione o condutor responsável.';
  }

  if (campos.senha.value !== campos.confirmarSenha.value) {
    return 'As senhas não coincidem.';
  }

  return null;
}

async function salvarAcesso(event) {
  event.preventDefault();

  const payload = montarPayload();
  const erro = validarPayload(payload);

  if (erro) {
    showError(erro);
    return;
  }

  try {
    if (usandoApi) {
      if (idEditando) {
        await window.API.put(`/acessos/${idEditando}`, payload);
      } else {
        await window.API.post('/acessos', payload);
      }

      await carregarAcessos();
    } else {
      const dadosNormalizados = normalizarAcesso(payload);

      if (idEditando) {
        acessos = acessos.map((item) => (
          item.id === idEditando ? { ...dadosNormalizados, id: idEditando } : item
        ));
      } else {
        const proximoId = acessos.length ? Math.max(...acessos.map((item) => item.id)) + 1 : 1;
        acessos.push({ ...dadosNormalizados, id: proximoId });
      }

      salvarLocal();
      renderTabela();
    }

    showSuccess(idEditando ? 'Acesso editado com sucesso.' : 'Acesso cadastrado com sucesso.');
    fecharModal();
  } catch (error) {
    showError(error.message || 'Não foi possível salvar o acesso.');
  }
}

async function excluirAcesso(id) {
  const confirmado = await showConfirm('Deseja excluir este acesso?');
  if (!confirmado) return;

  try {
    if (usandoApi) {
      await window.API.del(`/acessos/${id}`);
      await carregarAcessos();
    } else {
      acessos = acessos.filter((item) => item.id !== id);
      salvarLocal();
      renderTabela();
    }

    showSuccess('Acesso excluído com sucesso.');
  } catch (error) {
    showError(error.message || 'Não foi possível excluir o acesso.');
  }
}

btnNovo.addEventListener('click', () => abrirModal(false));
btnCancelar.addEventListener('click', fecharModal);

modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) fecharModal();
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

tbody.addEventListener('click', (event) => {
  const botao = event.target.closest('[data-acao]');
  if (!botao) return;

  const id = Number(botao.dataset.id);
  const acesso = acessos.find((item) => item.id === id);

  if (!acesso) return;

  if (botao.dataset.acao === 'editar') {
    abrirModal(true, acesso);
  }

  if (botao.dataset.acao === 'excluir') {
    excluirAcesso(id);
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
    fecharModal();
  }
});

carregarAcessos();


// Mostrar campo de condutor para monitor + validar senha
campos.acesso.addEventListener('change', () => {
  if (campos.acesso.value === 'Monitor') {
    grupoCondutor.style.display = 'block';
    carregarCondutores();
  } else {
    grupoCondutor.style.display = 'none';
    campos.condutorResponsavel.value = '';
  }
});

form.addEventListener('submit', (e) => {
  if (campos.senha && campos.confirmarSenha) {
    if (campos.senha.value !== campos.confirmarSenha.value) {
      e.preventDefault();
      if (window.Swal) {
        Swal.fire({
          icon: 'error',
          title: 'Senhas diferentes',
          text: 'A senha e a confirmação de senha devem ser iguais.'
        });
      } else {
        alert('A senha e a confirmação de senha devem ser iguais.');
      }
      return false;
    }
  }
});
