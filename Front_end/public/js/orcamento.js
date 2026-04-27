const API_BASE = '/api';

const botao = document.getElementById('botaoNovoOrcamento');
const modal = document.getElementById('fundoModal');
const cancelar = document.getElementById('botaoCancelar');
const salvarBtn = document.getElementById('botaoSalvar');
const tabelaLinhas = document.getElementById('linhasOrcamentos');

const campoId = document.getElementById('campoId');
const campoAluno = document.getElementById('campoAluno');
const campoTelefone = document.getElementById('campoTelefone');
const campoBairro = document.getElementById('campoBairro');
const campoEscola = document.getElementById('campoEscola');
const campoTurno = document.getElementById('campoTurno');
const campoTrajeto = document.getElementById('campoTrajeto');
const campoEmbarque = document.getElementById('campoEmbarque');
const campoDesembarque = document.getElementById('campoDesembarque');
const campoBusca = document.getElementById('campoBusca');

let orcamentos = [];
let statusAtual = 'pendente';
let idEmEdicao = null;

/* ================================
   ABRIR MODAL
================================ */
if (botao) {
  botao.addEventListener('click', () => {
    idEmEdicao = null;
    limparFormularioOrcamento();
    modal.classList.add('aberto');
  });
}

/* ================================
   FECHAR MODAL
================================ */
if (cancelar) {
  cancelar.addEventListener('click', () => {
    modal.classList.remove('aberto');
  });
}

/* ================================
   FECHAR CLICANDO FORA
================================ */
if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target.id === 'fundoModal') {
      modal.classList.remove('aberto');
    }
  });
}

/* ================================
   FUNÇÕES AUXILIARES
================================ */
function limparFormularioOrcamento() {
  if (campoId) campoId.value = '';
  if (campoAluno) campoAluno.value = '';
  if (campoTelefone) campoTelefone.value = '';
  if (campoBairro) campoBairro.value = '';
  if (campoEscola) campoEscola.value = '';
  if (campoTurno) campoTurno.value = '';
  if (campoTrajeto) campoTrajeto.value = '';
  if (campoEmbarque) campoEmbarque.value = '';
  if (campoDesembarque) campoDesembarque.value = '';
}

function formatarData(data) {
  if (!data) return '-';
  const partes = data.split('T')[0].split('-');
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

async function carregarOrcamentos() {
  try {
    const response = await fetch(`${API_BASE}/orcamentos`);
    if (!response.ok) throw new Error('Erro ao buscar orçamentos');
    const dados = await response.json();
    orcamentos = dados.map((o) => ({
      id: o.id_orcamento,
      nome: o.nome_cliente,
      telefone: o.telefone,
      bairro: o.bairro,
      escola: o.escola,
      turno: o.turno,
      tipo_trajeto: o.tipo_trajeto,
      endereco_embarque: o.endereco_embarque,
      endereco_desembarque: o.endereco_desembarque,
      status: (o.status || 'pendente').toLowerCase(),
      data_solicitacao: o.data_solicitacao
    }));
  } catch (error) {
    console.error('Erro ao carregar orçamentos:', error);
    orcamentos = [];
  }
}

function renderizarOrcamentos() {
  const busca = campoBusca ? campoBusca.value.trim().toLowerCase() : '';
  const filtrados = orcamentos.filter((o) => {
    const bateBusca = !busca || o.nome.toLowerCase().includes(busca);
    const bateStatus = !statusAtual || o.status === statusAtual;
    return bateBusca && bateStatus;
  });

  if (!tabelaLinhas) return;

  if (filtrados.length === 0) {
    tabelaLinhas.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum orçamento encontrado</td></tr>';
    return;
  }

  tabelaLinhas.innerHTML = filtrados.map((o) => `
    <tr>
      <td>${o.nome || '-'}</td>
      <td>${o.tipo_trajeto || '-'}</td>
      <td>${o.endereco_embarque || '-'}</td>
      <td>${o.endereco_desembarque || '-'}</td>
      <td><span class="badge-status ${o.status}">${o.status.toUpperCase()}</span></td>
      <td>
        <button class="botao-acao editar" data-id="${o.id}" title="Editar">Editar</button>
        <button class="botao-acao aprovar" data-id="${o.id}" title="Aprovar" ${o.status !== 'pendente' ? 'disabled' : ''}>Aprovar</button>
        <button class="botao-acao excluir" data-id="${o.id}" title="Excluir">Excluir</button>
      </td>
    </tr>
  `).join('');

  /* Delegação de eventos na tabela */
  tabelaLinhas.removeEventListener('click', handleTabelaClick);
  tabelaLinhas.addEventListener('click', handleTabelaClick);
}

function handleTabelaClick(event) {
  const btn = event.target.closest('button');
  if (!btn) return;

  const id = btn.dataset.id;
  if (!id) return;

  if (btn.classList.contains('editar')) {
    const orcamento = orcamentos.find((o) => String(o.id) === String(id));
    if (orcamento) {
      idEmEdicao = orcamento.id;
      if (campoId) campoId.value = orcamento.id;
      if (campoAluno) campoAluno.value = orcamento.nome;
      if (campoTelefone) campoTelefone.value = orcamento.telefone;
      if (campoBairro) campoBairro.value = orcamento.bairro || '';
      if (campoEscola) campoEscola.value = orcamento.escola || '';
      if (campoTurno) campoTurno.value = orcamento.turno || '';
      if (campoTrajeto) campoTrajeto.value = orcamento.tipo_trajeto || '';
      if (campoEmbarque) campoEmbarque.value = orcamento.endereco_embarque || '';
      if (campoDesembarque) campoDesembarque.value = orcamento.endereco_desembarque || '';
      modal.classList.add('ativo');
    }
  } else if (btn.classList.contains('aprovar')) {
    if (confirm('Aprovar este orçamento?')) {
      aprovarOrcamento(id);
    }
  } else if (btn.classList.contains('excluir')) {
    if (confirm('Excluir este orçamento?')) {
      excluirOrcamento(id);
    }
  }
}

async function salvarOrcamento() {
  if (!campoAluno || !campoAluno.value.trim()) {
    alert('Informe o nome do aluno');
    return;
  }

  const payload = {
    nome_cliente: campoAluno.value.trim(),
    telefone: campoTelefone ? campoTelefone.value.trim() : '',
    bairro: campoBairro ? campoBairro.value.trim() : '',
    escola: campoEscola ? campoEscola.value.trim() : '',
    turno: campoTurno ? campoTurno.value : null,
    quantidade_alunos: 1,
    tipo_trajeto: campoTrajeto ? campoTrajeto.value : '',
    endereco_embarque: campoEmbarque ? campoEmbarque.value.trim() : '',
    endereco_desembarque: campoDesembarque ? campoDesembarque.value.trim() : '',
    data_solicitacao: new Date().toISOString().split('T')[0]
  };

  const url = idEmEdicao ? `${API_BASE}/orcamentos/${idEmEdicao}` : `${API_BASE}/orcamentos`;
  const method = idEmEdicao ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Erro ao salvar');

    await carregarOrcamentos();
    renderizarOrcamentos();
    modal.classList.remove('ativo');
  } catch (error) {
    console.error(error);
    alert('Erro ao salvar orçamento');
  }
}

async function aprovarOrcamento(id) {
  try {
    const response = await fetch(`${API_BASE}/orcamentos/${id}/aprovar`, { method: 'PUT' });
    if (!response.ok) throw new Error('Erro ao aprovar');
    await carregarOrcamentos();
    renderizarOrcamentos();
  } catch (error) {
    console.error(error);
    alert('Erro ao aprovar orçamento');
  }
}

async function excluirOrcamento(id) {
  try {
    const response = await fetch(`${API_BASE}/orcamentos/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Erro ao excluir');
    await carregarOrcamentos();
    renderizarOrcamentos();
  } catch (error) {
    console.error(error);
    alert('Erro ao excluir orçamento');
  }
}

/* ================================
   EVENT LISTENERS
================================ */
if (salvarBtn) {
  salvarBtn.addEventListener('click', salvarOrcamento);
}

if (campoBusca) {
  campoBusca.addEventListener('input', renderizarOrcamentos);
}

/* Tabs de status */
const abasStatus = document.querySelectorAll('.aba-status');
abasStatus.forEach((aba) => {
  aba.addEventListener('click', () => {
    abasStatus.forEach((item) => item.classList.remove('active'));
    aba.classList.add('active');
    statusAtual = aba.dataset.status || 'pendente';
    renderizarOrcamentos();
  });
});

/* ================================
   INICIALIZA
================================ */
document.addEventListener('DOMContentLoaded', () => {
  carregarOrcamentos().then(() => renderizarOrcamentos());
});