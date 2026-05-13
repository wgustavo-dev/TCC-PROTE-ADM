import { initMenu } from '../core/menu.js';

initMenu();

const responsaveis = [
  { id: 1, nome: 'Roberto Alves', quantidade: 2, telefone: '(11) 99999-9999', email: 'roberto@gmail.com', mensalidade: '400,00', status: 'em_dia', vencimento: '20/05/2026', alunos: [{ nome: 'João Silva', valor: 'R$ 200,00' }, { nome: 'Julia Silva', valor: 'R$ 200,00' }] },
  { id: 2, nome: 'Suzane Andrade', quantidade: 1, telefone: '(11) 98888-9999', email: 'suzane@gmail.com', mensalidade: '200,00', status: 'atrasado', vencimento: '12/05/2026', alunos: [{ nome: 'Pedro Andrade', valor: 'R$ 200,00' }] }
];

let filtroBusca = '';
let filtroStatus = 'todos';
let filtroOrdem = 'alfabetica';
let idEmEdicao = null;

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
  mensalidade: document.getElementById('mensalidade'),
  email: document.getElementById('email'),
  telefone: document.getElementById('telefone'),
  status: document.getElementById('status')
};

function iniciais(nome) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return (partes[0]?.[0] || 'S') + (partes[1]?.[0] || 'N');
}

function listaFiltrada() {
  const lista = responsaveis.filter((r) => {
    const okBusca = r.nome.toLowerCase().includes(filtroBusca) || r.email.toLowerCase().includes(filtroBusca);
    const okStatus = filtroStatus === 'todos' || (filtroStatus === 'maior_3' ? r.quantidade >= 3 : r.status === filtroStatus);
    return okBusca && okStatus;
  });

  if (filtroOrdem === 'alfabetica') return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (filtroOrdem === 'alunos_desc') return lista.sort((a, b) => b.quantidade - a.quantidade);
  if (filtroOrdem === 'alunos_asc') return lista.sort((a, b) => a.quantidade - b.quantidade);
  return lista;
}

function renderTabela() {
  const dados = listaFiltrada();
  tbody.innerHTML = dados.map((r) => `
    <tr>
      <td>${r.nome}</td>
      <td>${r.quantidade}</td>
      <td>${r.telefone}<br>${r.email}</td>
      <td>R$ ${r.mensalidade}</td>
      <td><div class="acoes"><button class="acao-btn ver" data-ac="ver" data-id="${r.id}">▾</button><button class="acao-btn" data-ac="editar" data-id="${r.id}">✎</button><button class="acao-btn excluir" data-ac="excluir" data-id="${r.id}">🗑</button></div></td>
    </tr>`).join('');
  emptyState.classList.toggle('hidden', dados.length > 0);
}

function abrirDetalhes(id) {
  const r = responsaveis.find((x) => x.id === id);
  if (!r) return;
  document.getElementById('detNomeTopo').textContent = r.nome.toUpperCase();
  document.getElementById('detAvatar').textContent = iniciais(r.nome);
  document.getElementById('detTelefone').textContent = r.telefone;
  document.getElementById('detEmail').textContent = r.email;
  document.getElementById('detQtdAlunos').textContent = String(r.quantidade);
  document.getElementById('detTotal').textContent = `R$ ${r.mensalidade}`;
  document.getElementById('detVencimento').textContent = r.vencimento;
  document.getElementById('detSituacao').textContent = r.status === 'em_dia' ? 'Em dia' : 'Atrasado';
  document.getElementById('detAlunos').innerHTML = r.alunos.map((a) => `<div class="aluno-card"><strong>${a.nome}</strong><p>${a.valor}</p></div>`).join('');
  painelDetalhes.classList.remove('hidden');
}

function abrirModal(edicao = false, item = null) {
  idEmEdicao = item?.id || null;
  document.getElementById('modalTitulo').textContent = edicao ? 'Editar responsável' : 'Novo responsável';
  document.getElementById('btnSalvar').textContent = edicao ? 'Editar' : 'Salvar';
  form.reset();
  if (item) {
    camposForm.nome.value = item.nome;
    camposForm.quantidade.value = item.quantidade;
    camposForm.mensalidade.value = item.mensalidade;
    camposForm.email.value = item.email;
    camposForm.telefone.value = item.telefone;
    camposForm.status.value = item.status;
    document.getElementById('avatarModal').textContent = iniciais(item.nome);
  } else document.getElementById('avatarModal').textContent = 'SN';
  modalOverlay.classList.remove('hidden');
}

function salvarFormulario(e) {
  e.preventDefault();
  const payload = { nome: camposForm.nome.value.trim(), quantidade: Number(camposForm.quantidade.value), mensalidade: camposForm.mensalidade.value.trim(), email: camposForm.email.value.trim(), telefone: camposForm.telefone.value.trim(), status: camposForm.status.value };
  if (!payload.nome || !payload.email || !payload.telefone) return;
  if (idEmEdicao) {
    const idx = responsaveis.findIndex((r) => r.id === idEmEdicao);
    responsaveis[idx] = { ...responsaveis[idx], ...payload };
    modalOverlay.classList.add('hidden');
    renderTabela();
    return;
  }

  const novoResponsavel = { id: Date.now(), ...payload, vencimento: '-', alunos: [] };
  responsaveis.push(novoResponsavel);
  modalOverlay.classList.add('hidden');
  renderTabela();

  localStorage.setItem('responsavelParaAluno', JSON.stringify({
    nome: novoResponsavel.nome,
    telefone: novoResponsavel.telefone,
    email: novoResponsavel.email
  }));
  window.location.href = 'alunos.html?novoResponsavel=1';
}

inputBusca.addEventListener('input', (e) => { filtroBusca = e.target.value.toLowerCase(); renderTabela(); });
selectStatus.addEventListener('change', (e) => { filtroStatus = e.target.value; renderTabela(); });
if (selectOrdem) selectOrdem.addEventListener('change', (e) => { filtroOrdem = e.target.value; renderTabela(); });

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
    if (selectStatus) selectStatus.value = 'todos';
    if (selectOrdem) selectOrdem.value = 'alfabetica';
    renderTabela();
  });
}

document.getElementById('btnNovo').addEventListener('click', () => abrirModal(false));

// Botão Cancelar do formulário
document.getElementById('btnCancelar').addEventListener('click', () => modalOverlay.classList.add('hidden'));

// Botão X (fechar) do modal
const btnCloseModal = document.getElementById('btnCancelarModal');
if (btnCloseModal) {
  btnCloseModal.addEventListener('click', () => modalOverlay.classList.add('hidden'));
}

document.getElementById('btnFecharDetalhes').addEventListener('click', () => painelDetalhes.classList.add('hidden'));
camposForm.nome.addEventListener('input', () => { document.getElementById('avatarModal').textContent = iniciais(camposForm.nome.value); });
form.addEventListener('submit', salvarFormulario);

tbody.addEventListener('click', (e) => {
  const botao = e.target.closest('[data-ac]');
  if (!botao) return;
  const id = Number(botao.dataset.id);
  const acao = botao.dataset.ac;
  const item = responsaveis.find((r) => r.id === id);
  if (acao === 'ver') abrirDetalhes(id);
  if (acao === 'editar' && item) abrirModal(true, item);
  if (acao === 'excluir') {
    const idx = responsaveis.findIndex((r) => r.id === id);
    if (idx > -1) responsaveis.splice(idx, 1);
    painelDetalhes.classList.add('hidden');
    renderTabela();
  }
});

renderTabela();