// Base da API do backend para todas as chamadas do front-end.
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000/api';

// Elementos da tela e do formulário de orçamento.
const botao = document.getElementById('botaoNovoOrcamento');
const modal = document.getElementById('fundoModal');
const cancelar = document.getElementById('botaoCancelar');
const salvarBtn = document.getElementById('botaoSalvar');
const formOrcamento = document.getElementById('formOrcamento');
const tabelaLinhas = document.getElementById('linhasOrcamentos');

const campoId = document.getElementById('campoId');
const campoResponsavel = document.getElementById('campoResponsavel');
const campoTelefone = document.getElementById('campoTelefone');
const campoQuantidadeAlunos = document.getElementById('campoQuantidadeAlunos');
const campoBairro = document.getElementById('campoBairro');
const campoEscola = document.getElementById('campoEscola');
const campoValor = document.getElementById('campoValor');
const campoTurno = document.getElementById('campoTurno');
const campoTrajeto = document.getElementById('campoTrajeto');
const campoEmbarque = document.getElementById('campoEmbarque');
const campoDesembarque = document.getElementById('campoDesembarque');
const campoBusca = document.getElementById('campoBusca');

// Estado da página: orçamentos carregados, filtro ativo e edição atual.
let orcamentos = [];
let escolas = [];
let statusAtual = 'pendente';
let idEmEdicao = null;

// Faz a chamada HTTP com autenticação e tratamento de erro padrão.
async function request(path, options = {}) {
  const token = window.localStorage.getItem('prote_token');
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && options.body !== undefined && headers['Content-Type'] === undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.error || payload?.erro || payload?.message || `Erro HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

// Helpers para consumir as rotas do backend de forma consistente.
const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: (path) => request(path, { method: 'DELETE' }),
};

// Abre o modal em modo de criação.
function abrirModalOrcamento() {
  idEmEdicao = null;
  limparFormularioOrcamento();
  if (modal) modal.classList.add('ativo');
  if (typeof registrarEstadoInicialFormulario === 'function' && modal) {
    registrarEstadoInicialFormulario(modal);
  }
}

function fecharModalOrcamento() {
  if (modal) modal.classList.remove('ativo');
}

function fecharModalOrcamentoSeguro() {
  if (typeof fecharModalSeguro === 'function') {
    return fecharModalSeguro(modal, fecharModalOrcamento);
  }

  fecharModalOrcamento();
  return true;
}

if (botao) {
  botao.addEventListener('click', abrirModalOrcamento);
}

if (cancelar) {
  cancelar.addEventListener('click', fecharModalOrcamentoSeguro);
}

if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target.id === 'fundoModal') {
      fecharModalOrcamentoSeguro();
    }
  });
}

// Limpa os campos do formulário para um novo cadastro ou edição.
function limparFormularioOrcamento() {
  if (campoId) campoId.value = '';
  if (campoResponsavel) campoResponsavel.value = '';
  if (campoTelefone) campoTelefone.value = '';
  if (campoQuantidadeAlunos) campoQuantidadeAlunos.value = '';
  if (campoBairro) campoBairro.value = '';
  if (campoEscola) campoEscola.value = '';
  if (campoValor) campoValor.value = '';
  if (campoTurno) campoTurno.value = '';
  if (campoTrajeto) campoTrajeto.value = '';

  if (campoEmbarque) {
    campoEmbarque.value = '';
    campoEmbarque.disabled = true;
    campoEmbarque.closest('.grupo-campo')?.style.setProperty('display', 'none');
  }

  if (campoDesembarque) {
    campoDesembarque.value = '';
    campoDesembarque.disabled = true;
    campoDesembarque.closest('.grupo-campo')?.style.setProperty('display', 'none');
  }
}

// Ajusta os campos de embarque/desembarque conforme o tipo de trajeto escolhido.
function atualizarCamposTrajeto() {
  const tipoTrajeto = campoTrajeto && campoTrajeto.value ? String(campoTrajeto.value).toUpperCase() : '';
  const permiteEmbarque = tipoTrajeto === 'IDA' || tipoTrajeto === 'AMBOS';
  const permiteDesembarque = tipoTrajeto === 'VOLTA' || tipoTrajeto === 'AMBOS';

  if (campoEmbarque) {
    const grupoEmbarque = campoEmbarque.closest('.grupo-campo');
    campoEmbarque.disabled = !permiteEmbarque;
    if (grupoEmbarque) {
      grupoEmbarque.style.display = permiteEmbarque ? '' : 'none';
    }
    if (!permiteEmbarque) campoEmbarque.value = '';
  }

  if (campoDesembarque) {
    const grupoDesembarque = campoDesembarque.closest('.grupo-campo');
    campoDesembarque.disabled = !permiteDesembarque;
    if (grupoDesembarque) {
      grupoDesembarque.style.display = permiteDesembarque ? '' : 'none';
    }
    if (!permiteDesembarque) campoDesembarque.value = '';
  }
}

// Formata entradas do usuário para manter o cadastro consistente.
function aplicarMascaraNome(valor) {
  return String(valor || '')
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 100);
}

function aplicarMascaraTelefone(valor) {
  const numeros = String(valor || '').replace(/\D/g, '').slice(0, 11);

  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function validarTelefone(valor) {
  return /^\d{10,11}$/.test(String(valor || '').replace(/\D/g, ''));
}

function aplicarMascaraEndereco(valor) {
  return String(valor || '')
    .replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ.,º°ª\-/\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 255);
}

function limparMascaraTelefone(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function aplicarMascaraValor(valor) {
  const texto = String(valor || '').replace(/[R$\s]/g, '').trim();
  const numeros = texto.replace(/[^\d,]/g, '');

  if (!numeros) return '';

  const semSeparador = numeros.replace(/\./g, '').replace(',', '.');
  const numero = Number(semSeparador);

  if (!Number.isFinite(numero)) return '';

  const parteInteira = Math.trunc(numero);
  const parteDecimal = Math.round((numero - parteInteira) * 100);
  return (parteInteira + parteDecimal / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizarValorMonetario(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return null;

  const numero = Number(
    texto
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
  );

  return Number.isFinite(numero) ? numero : null;
}

function obterQuantidadeAlunos() {
  const quantidade = Number(campoQuantidadeAlunos?.value);
  return Number.isInteger(quantidade) && quantidade >= 1 ? quantidade : null;
}

// Padroniza os status vindos do backend para texto e classe no front.
function normalizarStatus(status) {
  const statusRaw = String(status || 'PENDENTE').toUpperCase();

  const mapa = {
    PENDENTE: { valor: 'pendente', texto: 'PENDENTE', classe: 'pendente' },
    EM_CADASTRO: { valor: 'em_cadastro', texto: 'EM CADASTRO', classe: 'pendente' },
    CONVERTIDO: { valor: 'convertido', texto: 'CONVERTIDO', classe: 'aprovado' },
    RECUSADO: { valor: 'reprovado', texto: 'RECUSADO', classe: 'reprovado' },
  };

  return mapa[statusRaw] || { valor: 'pendente', texto: statusRaw, classe: 'pendente' };
}

// Busca escolas no backend para preencher o select do formulário.
async function carregarEscolas() {
  try {
    const dados = await api.get('/escolas');
    escolas = Array.isArray(dados) ? dados : [];
    renderizarOpcoesEscola();
  } catch (error) {
    console.error('Erro ao carregar escolas:', error);
    escolas = [];
    renderizarOpcoesEscola();
  }
}

function renderizarOpcoesEscola() {
  if (!campoEscola) return;

  const opcoes = escolas
    .map((escola) => `<option value="${String(escola.nome || '').trim()}">${String(escola.nome || '').trim()}</option>`)
    .join('');

  campoEscola.innerHTML = `
    <option value="">Selecione uma escola</option>
    ${opcoes || '<option value="" disabled>Nenhuma escola cadastrada</option>'}
  `;

  const valorAtual = campoEscola.dataset.valorSelecionado || '';
  if (valorAtual) {
    campoEscola.value = valorAtual;
    delete campoEscola.dataset.valorSelecionado;
  }
}

// Busca a lista de orçamentos do backend para exibir na tabela.
async function carregarOrcamentos() {
  try {
    const dados = await api.get('/orcamentos');

    orcamentos = Array.isArray(dados) ? dados.map((o) => {
      const statusNormalizado = normalizarStatus(o.status);

      return {
        id: o.id_orcamento,
        nome: o.nome_responsavel,
        telefone: o.telefone,
        bairro: o.bairro,
        escola: o.escola,
        turno: o.turno,
        quantidade_alunos: Number(o.quantidade_alunos || 1),
        tipo_trajeto: o.tipo_trajeto,
        endereco_embarque: o.endereco_embarque,
        endereco_desembarque: o.endereco_desembarque,
        valor: o.valor !== null && o.valor !== undefined ? Number(o.valor) : null,
        status: statusNormalizado.valor,
        statusTexto: statusNormalizado.texto,
        statusClasse: statusNormalizado.classe,
        convertido: !!o.convertido,
        data_solicitacao: o.data_solicitacao,
      };
    }) : [];
  } catch (error) {
    console.error('Erro ao carregar orçamentos:', error);
    orcamentos = [];
  }
}

// Monta a tabela com os orçamentos filtrados e prontos para ação.
function renderizarOrcamentos() {
  const busca = campoBusca ? campoBusca.value.trim().toLowerCase() : '';

  const filtrados = orcamentos.filter((o) => {
    const nome = String(o.nome || '').toLowerCase();
    const bateBusca = !busca || nome.includes(busca);
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
      <td><span class="status-badge status-${o.statusClasse}">${o.statusTexto}</span></td>
      <td>
        <div class="coluna-acoes">
          <button class="botao-acao editar" data-id="${o.id}" title="Editar">Editar</button>
          <button class="botao-acao aprovar" data-id="${o.id}" title="Converter" ${o.status !== 'pendente' ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <button class="botao-acao excluir" data-id="${o.id}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6"></path><path d="M14 11v6"></path>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  tabelaLinhas.querySelectorAll('button[data-id]').forEach((button) => {
    button.onclick = null;
    button.addEventListener('click', handleTabelaClick);
  });
}

// Decide qual ação executar quando o usuário clica em um botão da linha da tabela.
async function handleTabelaClick(event) {
  const btn = event.target.closest('button');
  if (!btn) return;

  const id = btn.dataset.id;
  if (!id) return;

  if (btn.classList.contains('editar')) {
    const orcamento = orcamentos.find((item) => String(item.id) === String(id));
    if (!orcamento) return;

    idEmEdicao = orcamento.id;

    if (campoId) campoId.value = orcamento.id;
    if (campoResponsavel) campoResponsavel.value = orcamento.nome || '';
    if (campoTelefone) campoTelefone.value = aplicarMascaraTelefone(orcamento.telefone || '');
    if (campoQuantidadeAlunos) campoQuantidadeAlunos.value = orcamento.quantidade_alunos || 1;
    if (campoBairro) campoBairro.value = orcamento.bairro || '';
    if (campoEscola) {
      campoEscola.dataset.valorSelecionado = orcamento.escola || '';
      renderizarOpcoesEscola();
      campoEscola.value = orcamento.escola || '';
    }
    if (campoTurno) campoTurno.value = orcamento.turno || '';
    if (campoTrajeto) campoTrajeto.value = orcamento.tipo_trajeto || '';
    if (campoEmbarque) campoEmbarque.value = orcamento.endereco_embarque || '';
    if (campoDesembarque) campoDesembarque.value = orcamento.endereco_desembarque || '';
    if (campoValor) {
      campoValor.value = orcamento.valor !== undefined && orcamento.valor !== null
        ? aplicarMascaraValor(String(orcamento.valor))
        : '';
    }

    atualizarCamposTrajeto();
    if (modal) modal.classList.add('ativo');

    if (typeof registrarEstadoInicialFormulario === 'function' && modal) {
      registrarEstadoInicialFormulario(modal);
    }
    return;
  }

  if (btn.classList.contains('aprovar')) {
    const confirmado = await showConfirm('Aprovar este orçamento e iniciar o cadastro do cliente?');
    if (confirmado.isConfirmed) {
      converterOrcamento(id);
    }
    return;
  }

  if (btn.classList.contains('excluir')) {
    const confirmado = await showConfirm('Excluir este orçamento?');
    if (confirmado.isConfirmed) {
      excluirOrcamento(id);
    }
  }
}

// Valida e salva o orçamento no backend, em edição ou criação.
async function salvarOrcamento() {
  const nomeResponsavel = aplicarMascaraNome(campoResponsavel?.value || '').trim();
  if (!nomeResponsavel || nomeResponsavel.length < 2) {
    showWarning('Informe o nome do responsável com no mínimo 2 caracteres.');
    return;
  }

  const telefoneLimpo = limparMascaraTelefone(campoTelefone?.value || '');
  if (!validarTelefone(telefoneLimpo)) {
    showWarning('Informe um telefone válido com DDD e 10 ou 11 dígitos.');
    return;
  }

  const quantidadeAlunos = obterQuantidadeAlunos();
  if (!quantidadeAlunos) {
    showWarning('Informe a quantidade de alunos.');
    return;
  }

  const bairro = campoBairro ? aplicarMascaraEndereco(campoBairro.value).trim() : '';
  const escola = campoEscola ? String(campoEscola.value || '').trim() : '';
  if (!escola || escola.length < 2) {
    showWarning('Selecione uma escola cadastrada.');
    return;
  }

  const turno = campoTurno && campoTurno.value ? String(campoTurno.value).toUpperCase() : '';
  if (!['MANHA', 'TARDE'].includes(turno)) {
    showWarning('Selecione um turno válido: MANHA ou TARDE.');
    return;
  }

  const tipoTrajeto = campoTrajeto && campoTrajeto.value ? String(campoTrajeto.value).toUpperCase() : '';
  if (!['IDA', 'VOLTA', 'AMBOS'].includes(tipoTrajeto)) {
    showWarning('Selecione um tipo de trajeto válido: IDA, VOLTA ou AMBOS.');
    return;
  }

  const valorNumerico = campoValor && campoValor.value ? normalizarValorMonetario(campoValor.value) : null;
  if (campoValor && campoValor.value && (valorNumerico === null || valorNumerico < 0 || valorNumerico > 9999999.99)) {
    showWarning('Informe um valor válido para o orçamento.');
    return;
  }

  const embarque = campoEmbarque ? aplicarMascaraEndereco(campoEmbarque.value).trim() : '';
  const desembarque = campoDesembarque ? aplicarMascaraEndereco(campoDesembarque.value).trim() : '';

  if (tipoTrajeto === 'IDA' || tipoTrajeto === 'AMBOS') {
    if (!embarque || embarque.length < 5) {
      showWarning('Informe o endereço de embarque para o trajeto de ida.');
      return;
    }
  } else if (campoEmbarque && campoEmbarque.value) {
    campoEmbarque.value = '';
  }

  if (tipoTrajeto === 'VOLTA' || tipoTrajeto === 'AMBOS') {
    if (!desembarque || desembarque.length < 5) {
      showWarning('Informe o endereço de desembarque para o trajeto de volta.');
      return;
    }
  } else if (campoDesembarque && campoDesembarque.value) {
    campoDesembarque.value = '';
  }

  const payload = {
    nome_responsavel: nomeResponsavel,
    telefone: telefoneLimpo,
    quantidade_alunos: quantidadeAlunos,
    bairro,
    escola,
    valor: Number.isFinite(valorNumerico) ? valorNumerico : null,
    turno,
    tipo_trajeto: tipoTrajeto,
    endereco_embarque: tipoTrajeto === 'IDA' || tipoTrajeto === 'AMBOS' ? embarque : null,
    endereco_desembarque: tipoTrajeto === 'VOLTA' || tipoTrajeto === 'AMBOS' ? desembarque : null,
    data_solicitacao: new Date().toISOString().split('T')[0],
  };

  try {
    if (idEmEdicao) {
      await api.put(`/orcamentos/${idEmEdicao}`, payload);
    } else {
      await api.post('/orcamentos', payload);
    }

    await carregarOrcamentos();
    renderizarOrcamentos();
    fecharModalOrcamento();
  } catch (error) {
    console.error(error);
    showError(error.message || 'Erro ao salvar orçamento');
  }
}

// Converte o orçamento em fluxo de cadastro do responsável e redireciona.
async function converterOrcamento(id) {
  try {
    await api.put(`/orcamentos/${id}/converter`, {});

    const params = new URLSearchParams();
    params.set('fluxo', 'orcamento');
    params.set('id_orcamento', String(id));
    window.location.href = `responsaveis.html?${params.toString()}`;
  } catch (error) {
    console.error(error);
    showError(error.message || 'Erro ao aprovar orçamento');
  }
}

// Remove o registro do backend e atualiza a tabela.
async function excluirOrcamento(id) {
  try {
    await api.del(`/orcamentos/${id}`);
    await carregarOrcamentos();
    renderizarOrcamentos();
  } catch (error) {
    console.error(error);
    showError(error.message || 'Erro ao excluir orçamento');
  }
}

if (formOrcamento) {
  formOrcamento.addEventListener('submit', async (event) => {
    event.preventDefault();
    await salvarOrcamento();
  });
}

if (salvarBtn) {
  salvarBtn.type = 'submit';
}

if (campoResponsavel) {
  campoResponsavel.addEventListener('input', () => {
    campoResponsavel.value = aplicarMascaraNome(campoResponsavel.value);
  });
}

if (campoTelefone) {
  campoTelefone.addEventListener('input', () => {
    campoTelefone.value = aplicarMascaraTelefone(campoTelefone.value);
  });
}

if (campoBairro) {
  campoBairro.addEventListener('input', () => {
    campoBairro.value = aplicarMascaraEndereco(campoBairro.value);
  });
}

if (campoEscola) {
  campoEscola.addEventListener('change', () => {
    campoEscola.value = String(campoEscola.value || '').trim();
  });
}

if (campoTrajeto) {
  campoTrajeto.addEventListener('change', () => {
    campoTrajeto.value = String(campoTrajeto.value || '').trim();
    atualizarCamposTrajeto();
  });
}

if (campoValor) {
  campoValor.addEventListener('input', () => {
    const valorAtual = campoValor.value;
    const valorNumerico = valorAtual.replace(/[^\d,]/g, '');

    if (!valorNumerico) {
      campoValor.value = '';
      return;
    }

    campoValor.value = aplicarMascaraValor(valorAtual);
  });
}

if (campoEmbarque) {
  campoEmbarque.addEventListener('input', () => {
    campoEmbarque.value = aplicarMascaraEndereco(campoEmbarque.value);
  });
}

if (campoDesembarque) {
  campoDesembarque.addEventListener('input', () => {
    campoDesembarque.value = aplicarMascaraEndereco(campoDesembarque.value);
  });
}

if (campoBusca) {
  campoBusca.addEventListener('input', renderizarOrcamentos);
}

// Filtra a tabela pelo status selecionado nas abas da página.
const abasStatus = document.querySelectorAll('.aba-status');
abasStatus.forEach((aba) => {
  aba.addEventListener('click', () => {
    abasStatus.forEach((item) => item.classList.remove('active'));
    aba.classList.add('active');
    statusAtual = aba.dataset.status || 'pendente';
    renderizarOrcamentos();
  });
});

// Controla a abertura/fechamento do menu lateral da interface.
function initMenu() {
  const botaoMenu = document.getElementById('botaoMenu');
  const sidebar = document.getElementById('sidebar');
  const fundoEscuro = document.getElementById('fundoEscuro');

  if (!botaoMenu || !sidebar || !fundoEscuro) return;

  botaoMenu.addEventListener('click', () => {
    sidebar.classList.toggle('aberta');
    fundoEscuro.classList.toggle('visivel');
    botaoMenu.classList.toggle('aberto');
  });

  fundoEscuro.addEventListener('click', () => {
    sidebar.classList.remove('aberta');
    fundoEscuro.classList.remove('visivel');
    botaoMenu.classList.remove('aberto');
  });
}

// Inicializa os recursos da página quando o DOM estiver pronto.
document.addEventListener('DOMContentLoaded', () => {
  initMenu();
  carregarEscolas();
  carregarOrcamentos().then(() => renderizarOrcamentos());
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal && modal.classList.contains('ativo')) {
    fecharModalOrcamentoSeguro();
  }
});

const botaoFecharModal = document.getElementById('botaoFecharModal');

if (botaoFecharModal) {
  botaoFecharModal.addEventListener('click', () => {
    fecharModalOrcamentoSeguro();
  });
}

