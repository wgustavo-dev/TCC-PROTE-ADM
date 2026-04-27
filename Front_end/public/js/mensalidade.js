console.log('mensalidades.js carregou');

/* ================================
   DADOS INICIAIS
================================ */
let mensalidades = [
  {
    id: 1,
    aluno: 'João Silva',
    responsavel: 'Filho da Jussara',
    valor: 300,
    vencimento: '2026-04-03',
    pagamento: '',
    status: 'atrasado',
    contato: ['(11) 91234-0000', '(11) 91457-0000'],
    foto: ''
  },
  {
    id: 2,
    aluno: 'Maria Souza',
    responsavel: 'Responsável não informado',
    valor: 300,
    vencimento: '2026-04-20',
    pagamento: '2026-04-10',
    status: 'pago',
    contato: ['(11) 91234-6159', '(11) 91628-2679'],
    foto: ''
  }
];

/* ================================
   ELEMENTOS
================================ */
const botaoNova = document.getElementById('botaoNovaMensalidade');
const fundoModal = document.getElementById('fundoModalMensalidade');
const botaoCancelar = document.getElementById('botaoCancelarMensalidade');
const botaoSalvar = document.getElementById('botaoSalvarMensalidade');
const campoBusca = document.getElementById('campoBuscaMensalidade');
const linhasTabela = document.getElementById('linhasMensalidades');

const campoFoto = document.getElementById('campoFotoMensalidade');
const fotoTopo = document.getElementById('fotoTopoMensalidade');

let idEditando = null;
let fotoBase64 = '';

/* ================================
   FUNÇÕES AUXILIARES
================================ */
function formatarBRL(valor) {
  return 'R$ ' + Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarData(data) {
  if (!data) return '—';
  const partes = data.split('-');
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function statusPorDatas(pagamento, vencimento) {
  if (pagamento) return 'pago';

  const hoje = new Date();
  const dataVencimento = new Date(vencimento + 'T00:00:00');

  return dataVencimento < hoje ? 'atrasado' : 'pendente';
}

function badgeStatus(status) {
  if (status === 'pago') {
    return `<span class="status-badge status-pago">✔</span>`;
  }

  if (status === 'atrasado') {
    return `<span class="status-badge status-atrasado">⚠</span>`;
  }

  return `<span class="status-badge status-pendente">◌</span>`;
}

function iconeEditar() {
  return `
    <svg class="icone-acao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>
  `;
}

function iconeMensagem() {
  return `
    <svg class="icone-acao" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  `;
}

/* ================================
   RENDERIZAR TABELA
================================ */
function renderizarTabela() {
  const busca = campoBusca.value.toLowerCase().trim();

  const listaFiltrada = mensalidades.filter((item) =>
    item.aluno.toLowerCase().includes(busca)
  );

  if (!listaFiltrada.length) {
    linhasTabela.innerHTML = '';
    document.getElementById('tabelaMensalidades').style.display = 'none';
    document.getElementById('avisoVazioMensalidade').style.display = 'block';
    return;
  }

  document.getElementById('tabelaMensalidades').style.display = 'table';
  document.getElementById('avisoVazioMensalidade').style.display = 'none';

  linhasTabela.innerHTML = listaFiltrada.map((item) => `
    <tr>
      <td>
        <div class="celula-aluno">
          <div class="avatar-tabela">
            ${
              item.foto
                ? `<img src="${item.foto}" class="foto-tabela">`
                : ''
            }
          </div>
          <div class="nome-aluno">${item.aluno}</div>
        </div>
      </td>
      <td>${formatarBRL(item.valor)}</td>
      <td>${formatarData(item.vencimento)}</td>
      <td>${badgeStatus(item.status)}</td>
      <td>${formatarData(item.pagamento)}</td>
      <td>
        <div class="lista-contatos">
          ${item.contato.map((fone) => `<span>${fone}</span>`).join('')}
        </div>
      </td>
      <td>
        <div class="area-acoes">
          <button class="botao-acao" data-acao="editar" data-id="${item.id}" title="Editar">
            ${iconeEditar()}
          </button>
          <button class="botao-acao" data-acao="mensagem" data-id="${item.id}" title="Mensagem">
            ${iconeMensagem()}
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ================================
   RESUMO
================================ */
function atualizarResumo() {
  const total = mensalidades.reduce((soma, item) => soma + Number(item.valor || 0), 0);
  const pago = mensalidades.filter((item) => item.status === 'pago').length;
  const atrasadas = mensalidades.filter((item) => item.status === 'atrasado').length;
  const pendentes = mensalidades.filter((item) => item.status === 'pendente').length;

  document.getElementById('resumoTotal').textContent = formatarBRL(total);
  document.getElementById('resumoPago').textContent = pago;
  document.getElementById('resumoAtrasadas').textContent = atrasadas;
  document.getElementById('resumoPendentes').textContent = pendentes;
}

/* ================================
   MODAL
================================ */
function abrirModalNova() {
  idEditando = null;

  document.getElementById('tituloModalMensalidade').textContent = 'Nova mensalidade';
  botaoSalvar.textContent = 'Cadastrar';

  limparCampos();

  fundoModal.classList.add('ativo');
}

function abrirModalEditar(id) {
  const mensalidade = mensalidades.find((item) => item.id === Number(id));
  if (!mensalidade) return;

  idEditando = mensalidade.id;

  document.getElementById('tituloModalMensalidade').textContent = 'Editar mensalidade';
  botaoSalvar.textContent = 'Editar';

  document.getElementById('campoIdMensalidade').value = mensalidade.id;
  document.getElementById('campoAlunoMensalidade').value = mensalidade.aluno;
  document.getElementById('campoValorMensalidade').value = mensalidade.valor;
  document.getElementById('campoPagamentoMensalidade').value = mensalidade.pagamento;
  document.getElementById('campoVencimentoMensalidade').value = mensalidade.vencimento;
  document.getElementById('campoContatoMensalidade').value = mensalidade.contato.join(', ');
  document.getElementById('campoResponsavelMensalidade').value = mensalidade.responsavel;

  document.getElementById('nomeAlunoModalInfo').textContent = mensalidade.aluno;
  document.getElementById('responsavelModalInfo').textContent = mensalidade.responsavel;

  fotoBase64 = mensalidade.foto || '';

 const avatarModal = document.getElementById('avatarModal');

if (fotoBase64) {
  fotoTopo.src = fotoBase64;
  avatarModal.classList.add('com-foto');
}
  fundoModal.classList.add('ativo');
}

function fecharModal() {
  fundoModal.classList.remove('ativo');
}

function limparCampos() {
  document.getElementById('campoIdMensalidade').value = '';
  document.getElementById('campoAlunoMensalidade').value = '';
  document.getElementById('campoValorMensalidade').value = '';
  document.getElementById('campoPagamentoMensalidade').value = '';
  document.getElementById('campoVencimentoMensalidade').value = '';
  document.getElementById('campoContatoMensalidade').value = '';
  document.getElementById('campoResponsavelMensalidade').value = '';

  document.getElementById('nomeAlunoModalInfo').textContent = 'Novo cadastro';
  document.getElementById('responsavelModalInfo').textContent = 'Responsável';

  fotoBase64 = '';

  if (campoFoto) campoFoto.value = '';

fotoTopo.src = '';

const avatarModal = document.getElementById('avatarModal');
avatarModal.classList.remove('com-foto');
}

/* ================================
   SALVAR
================================ */
function salvarMensalidade() {
  const aluno = document.getElementById('campoAlunoMensalidade').value.trim();
  const valor = document.getElementById('campoValorMensalidade').value.trim();
  const pagamento = document.getElementById('campoPagamentoMensalidade').value;
  const vencimento = document.getElementById('campoVencimentoMensalidade').value;
  const contatoTexto = document.getElementById('campoContatoMensalidade').value.trim();
  const responsavel = document.getElementById('campoResponsavelMensalidade').value.trim();

  if (!aluno || !valor || !vencimento || !contatoTexto || !responsavel) {
    alert('Preencha todos os campos obrigatórios.');
    return;
  }

  const dados = {
    aluno,
    responsavel,
    valor: Number(valor),
    pagamento,
    vencimento,
    status: statusPorDatas(pagamento, vencimento),
    contato: contatoTexto.split(',').map((fone) => fone.trim()).filter(Boolean),
    foto: fotoBase64
  };

  if (idEditando) {
    mensalidades = mensalidades.map((item) =>
      item.id === idEditando ? { ...item, ...dados } : item
    );
  } else {
    mensalidades.push({
      id: Date.now(),
      ...dados
    });
  }

  fecharModal();
  renderizarTabela();
  atualizarResumo();
}

/* ================================
   EVENTO DA FOTO
================================ */
if (campoFoto) {
  campoFoto.addEventListener('change', () => {
    const file = campoFoto.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      fotoBase64 = reader.result;

    fotoTopo.src = fotoBase64;

const avatarModal = document.getElementById('avatarModal');
avatarModal.classList.add('com-foto');
    };

    reader.readAsDataURL(file);
  });
}

/* ================================
   EVENTOS
================================ */
botaoNova.addEventListener('click', abrirModalNova);
botaoCancelar.addEventListener('click', fecharModal);
botaoSalvar.addEventListener('click', salvarMensalidade);
campoBusca.addEventListener('input', renderizarTabela);

fundoModal.addEventListener('click', (event) => {
  if (event.target === fundoModal) {
    fecharModal();
  }
});

linhasTabela.addEventListener('click', (event) => {
  const botaoEditar = event.target.closest('[data-acao="editar"]');
  const botaoMensagem = event.target.closest('[data-acao="mensagem"]');

  if (botaoEditar) {
    abrirModalEditar(botaoEditar.dataset.id);
  }

  if (botaoMensagem) {
    alert('Função de mensagem será adicionada depois.');
  }
});

/* ================================
   INICIAR
================================ */
renderizarTabela();
atualizarResumo();