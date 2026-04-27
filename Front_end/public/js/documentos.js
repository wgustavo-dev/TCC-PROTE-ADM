const PRAZOS = {
  CNH: { anos: 10 },
  'Tacógrafo Vistoria': { anos: 2 },
  'CRLV Perua': { anos: 1 },
  'Vistoria Inspeção DETRAN': { meses: 6 },
  CRMC: { anos: 5 },
  'Certificado de Registro Municipal': { anos: 1 }
};

const botaoMenu = document.getElementById('botaoMenu');
const sidebar = document.getElementById('sidebar');
const fundoEscuro = document.getElementById('fundoEscuro');

const btnAbrirModal = document.getElementById('btnAbrirModal');
const btnFecharModal = document.getElementById('btnFecharModal');
const btnCancelar = document.getElementById('btnCancelar');
const modalOverlay = document.getElementById('modalOverlay');
/* */
const btnToggleFiltros = document.getElementById('btnToggleFiltros');
const filtrosCard = document.getElementById('filtrosCard');
const btnLimparFiltros = document.getElementById('btnLimparFiltros');

const formDocumento = document.getElementById('formDocumento');
const documentoId = document.getElementById('documentoId');
const tipoDocumento = document.getElementById('tipoDocumento');
const dataRealizacao = document.getElementById('dataRealizacao');
const dataValidade = document.getElementById('dataValidade');
const statusPreview = document.getElementById('statusPreview');
const modalTitulo = document.getElementById('modalTitulo');

const inputBusca = document.getElementById('inputBusca');
const filtroStatus = document.getElementById('filtroStatus');
const filtroRealizacao = document.getElementById('filtroRealizacao');
const filtroValidade = document.getElementById('filtroValidade');

const tbodyDocumentos = document.getElementById('tbodyDocumentos');
const emptyState = document.getElementById('emptyState');
const alertasContainer = document.getElementById('alertasContainer');

const totalDocs = document.getElementById('totalDocs');
const validosDocs = document.getElementById('validosDocs');
const vencidosDocs = document.getElementById('vencidosDocs');

let documentos = [];

document.addEventListener('DOMContentLoaded', async () => {
  configurarMenuMobile();
  configurarModal();
  configurarFiltros();
  configurarFormulario();

  await carregarDocumentosDoBackend();
  renderizarTudo();
});

function configurarMenuMobile() {
  if (!botaoMenu || !sidebar || !fundoEscuro) return;

  botaoMenu.addEventListener('click', () => {
    botaoMenu.classList.toggle('aberto');
    sidebar.classList.toggle('aberta');
    fundoEscuro.classList.toggle('visivel');
  });

  fundoEscuro.addEventListener('click', () => {
    botaoMenu.classList.remove('aberto');
    sidebar.classList.remove('aberta');
    fundoEscuro.classList.remove('visivel');
  });
}

function configurarModal() {
  btnAbrirModal.addEventListener('click', abrirModalNovo);
  btnFecharModal.addEventListener('click', fecharModal);
  btnCancelar.addEventListener('click', fecharModal);

  modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
      fecharModal();
    }
  });

  tipoDocumento.addEventListener('change', atualizarPreviewDocumento);
  dataRealizacao.addEventListener('input', atualizarPreviewDocumento);
}

function abrirModalNovo() {
  modalTitulo.textContent = 'Nova Vistoria';
  formDocumento.reset();
  documentoId.value = '';
  dataValidade.value = '';
  statusPreview.value = '';
  modalOverlay.classList.remove('hidden');
}

function abrirModalEditar(documento) {
  modalTitulo.textContent = 'Editar Documento';
  documentoId.value = documento.id || '';
  tipoDocumento.value = documento.tipo || '';
  dataRealizacao.value = documento.dataRealizacao || '';
  dataValidade.value = documento.dataValidade || '';
  statusPreview.value = formatarStatusTexto(documento.status || '');
  modalOverlay.classList.remove('hidden');
}

function fecharModal() {
  modalOverlay.classList.add('hidden');
}

function configurarFiltros() {
  btnToggleFiltros.addEventListener('click', () => {
    filtrosCard.classList.toggle('hidden');
    btnToggleFiltros.classList.toggle('aberto');
  });

  inputBusca.addEventListener('input', renderizarTabela);
  filtroStatus.addEventListener('change', renderizarTabela);
  filtroRealizacao.addEventListener('change', renderizarTabela);
  filtroValidade.addEventListener('change', renderizarTabela);

  btnLimparFiltros.addEventListener('click', () => {
    inputBusca.value = '';
    filtroStatus.value = '';
    filtroRealizacao.value = '';
    filtroValidade.value = '';
    renderizarTabela();
  });
}

function configurarFormulario() {
  formDocumento.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = montarPayloadFormulario();

    if (!payload.tipo_documento || !payload.data_emissao) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const id = documentoId.value;
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/documentos/${id}` : '/api/documentos';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      await carregarDocumentosDoBackend();
      renderizarTudo();
      fecharModal();
    } catch (error) {
      console.error(error);
      alert('Não foi possível salvar o documento.');
    }
  });
}

function montarPayloadFormulario() {
  const tipo = tipoDocumento.value;
  const realizacao = dataRealizacao.value;
  const validade = tipo && realizacao ? calcularValidade(tipo, realizacao) : '';
  const status = validade ? calcularStatus(validade) : '';

  return {
    tipo_documento: tipo,
    data_emissao: realizacao,
    data_validade: validade,
    status: status === 'vencido' ? 'VENCIDO' : 'VALIDO'
  };
}

function atualizarPreviewDocumento() {
  const tipo = tipoDocumento.value;
  const realizacao = dataRealizacao.value;

  if (!tipo || !realizacao) {
    dataValidade.value = '';
    statusPreview.value = '';
    return;
  }

  const validade = calcularValidade(tipo, realizacao);
  const status = calcularStatus(validade);

  dataValidade.value = validade;
  statusPreview.value = formatarStatusTexto(status);
}

async function carregarDocumentosDoBackend() {
  try {
    const response = await fetch('/api/documentos');
    if (!response.ok) throw new Error('Erro ao buscar documentos');
    const dados = await response.json();

    documentos = dados.map((doc) => ({
      id: doc.id_documento,
      tipo: doc.tipo_documento,
      dataRealizacao: doc.data_emissao ? doc.data_emissao.split('T')[0] : '',
      dataValidade: doc.data_validade ? doc.data_validade.split('T')[0] : '',
      status: calcularStatus(doc.data_validade ? doc.data_validade.split('T')[0] : '')
    }));
  } catch (error) {
    console.error('Erro ao carregar documentos:', error);
    documentos = [];
  }
}

function calcularValidade(tipo, dataBase) {
  const prazo = PRAZOS[tipo];
  const data = new Date(`${dataBase}T00:00:00`);

  if (!prazo) return dataBase;

  if (prazo.anos) {
    data.setFullYear(data.getFullYear() + prazo.anos);
  }

  if (prazo.meses) {
    data.setMonth(data.getMonth() + prazo.meses);
  }

  return data.toISOString().split('T')[0];
}

function calcularStatus(dataValidadeFinal) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const validade = new Date(`${dataValidadeFinal}T00:00:00`);
  validade.setHours(0, 0, 0, 0);

  const diferencaMs = validade - hoje;
  const diferencaDias = Math.ceil(diferencaMs / (1000 * 60 * 60 * 24));

  if (diferencaDias < 0) return 'vencido';
  if (diferencaDias <= 30) return 'proximo';
  return 'valido';
}

function formatarData(dataIso) {
  if (!dataIso) return '-';
  const [ano, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarStatusTexto(status) {
  if (status === 'valido') return 'Válido';
  if (status === 'proximo') return 'Próximo do vencimento';
  if (status === 'vencido') return 'Vencido';
  return '-';
}

function renderizarTudo() {
  renderizarCards();
  renderizarAlertas();
  renderizarTabela();
}

function renderizarCards() {
  const total = documentos.length;
  const validos = documentos.filter(doc => doc.status === 'valido').length;
  const vencidos = documentos.filter(doc => doc.status === 'vencido').length;

  totalDocs.textContent = total;
  validosDocs.textContent = validos;
  vencidosDocs.textContent = vencidos;
}

function renderizarAlertas() {
  const alertas = documentos.filter(
    doc => doc.status === 'proximo' || doc.status === 'vencido'
  );

  if (!alertas.length) {
    alertasContainer.innerHTML = '';
    return;
  }

  alertasContainer.innerHTML = `
    <div class="alert-list">
      ${alertas.map(doc => `
        <div class="alert-card ${doc.status}">
          <strong>${doc.tipo}</strong>
          <span>
            ${doc.status === 'vencido'
              ? `Documento vencido em ${formatarData(doc.dataValidade)}.`
              : `Documento próximo do vencimento em ${formatarData(doc.dataValidade)}.`}
          </span>
        </div>
      `).join('')}
    </div>
  `;
}

function obterDocumentosFiltrados() {
  const busca = inputBusca.value.trim().toLowerCase();
  const status = filtroStatus.value;
  const realizacao = filtroRealizacao.value;
  const validade = filtroValidade.value;

  return documentos.filter((doc) => {
    const matchBusca = !busca || (doc.tipo || '').toLowerCase().includes(busca);
    const matchStatus = !status || doc.status === status;
    const matchRealizacao = !realizacao || doc.dataRealizacao === realizacao;
    const matchValidade = !validade || doc.dataValidade === validade;

    return matchBusca && matchStatus && matchRealizacao && matchValidade;
  });
}

function renderizarTabela() {
  const lista = obterDocumentosFiltrados();

  if (!lista.length) {
    tbodyDocumentos.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  tbodyDocumentos.innerHTML = lista.map((doc) => `
    <tr>
      <td>${doc.tipo || '-'}</td>
      <td>${formatarData(doc.dataRealizacao)}</td>
      <td>${formatarData(doc.dataValidade)}</td>
      <td>
        <span class="badge-status ${doc.status}">
          ${formatarStatusTexto(doc.status)}
        </span>
      </td>
      <td>
        <div class="actions">
          <button class="icon-btn edit" data-id="${doc.id || ''}" data-action="editar" aria-label="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
          </button>

          <button class="icon-btn delete" data-id="${doc.id || ''}" data-action="excluir" aria-label="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

tbodyDocumentos.addEventListener('click', async (event) => {
  const botao = event.target.closest('button[data-action]');
  if (!botao) return;

  const action = botao.dataset.action;
  const id = botao.dataset.id;

  const documento = documentos.find(doc => String(doc.id) === String(id));
  if (!documento) return;

  if (action === 'editar') {
    abrirModalEditar(documento);
    return;
  }

  if (action === 'excluir') {
    const confirmar = confirm('Tem certeza que deseja excluir este documento?');
    if (!confirmar) return;

    try {
      const response = await fetch(`/api/documentos/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao excluir');
      await carregarDocumentosDoBackend();
      renderizarTudo();
    } catch (error) {
      console.error(error);
      alert('Não foi possível excluir o documento.');
    }
  }
});