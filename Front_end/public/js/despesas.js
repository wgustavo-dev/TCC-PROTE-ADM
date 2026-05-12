/* =========================================================
   ALERTAS PERSONALIZADOS - SWEETALERT2
   ========================================================= */

function showSuccess(message) {
  return Swal.fire({
    icon: "success",
    title: "Sucesso!",
    text: message,
    confirmButtonText: "OK",
    customClass: {
      popup: "prote-alert",
      title: "prote-alert-title",
      confirmButton: "prote-alert-button"
    },
    buttonsStyling: false
  });
}

function showError(message) {
  return Swal.fire({
    icon: "error",
    title: "Erro!",
    text: message,
    confirmButtonText: "OK",
    customClass: {
      popup: "prote-alert",
      title: "prote-alert-title",
      confirmButton: "prote-alert-button"
    },
    buttonsStyling: false
  });
}

function showWarning(message) {
  return Swal.fire({
    icon: "warning",
    title: "Atenção!",
    text: message,
    confirmButtonText: "OK",
    customClass: {
      popup: "prote-alert",
      title: "prote-alert-title",
      confirmButton: "prote-alert-button"
    },
    buttonsStyling: false
  });
}

function showConfirm(message) {
  return Swal.fire({
    icon: "warning",
    title: "Confirmar ação",
    text: message,
    showCancelButton: true,
    confirmButtonText: "Confirmar",
    cancelButtonText: "Cancelar",
    customClass: {
      popup: "prote-alert",
      title: "prote-alert-title",
      confirmButton: "prote-alert-button",
      cancelButton: "prote-alert-cancel-button"
    },
    buttonsStyling: false
  });
}

/* 
   DADOS
   Carrega da API /api/despesas
*/
var API_BASE = '/api';

async function carregarDespesas() {
  try {
    var response = await fetch(API_BASE + '/despesas');
    if (!response.ok) throw new Error('Erro ao buscar despesas');
    var dados = await response.json();
    /* Mapear do banco para frontend - ajustar campos conforme modelo */
    return dados.map(function(d) {
      return {
        id: d.id_despesa,
        tipo: d.tipo,
        valor: parseFloat(d.valor) || 0,
        data: d.data ? (typeof d.data === 'string' ? d.data.split('T')[0] : d.data) : '',
        descricao: d.descricao
      };
    });
  } catch (e) {
    console.error('Erro ao carregar despesas:', e);
  }
  return [];
}

var despesas = [];
var proximoId = 1;

/* ID da despesa em edição ou exclusão no momento */
var idEmEdicao   = null;
var idEmExclusao = null;


/* 
   REFERÊNCIAS AOS ELEMENTOS DO HTML
   Centralizadas aqui para evitar document.getElementById
   espalhados pelo código.
 */
var tabelaCorpo        = document.getElementById('linhasDespesas');
var avisoVazio         = document.getElementById('avisoVazio');
var tabelaDespesas     = document.getElementById('tabelaDespesas');
var totalMensal        = document.getElementById('totalMensal');
var quantidadeDespesas = document.getElementById('quantidadeDespesas');
var mediaDespesas      = document.getElementById('mediaDespesas');

var campoBusca         = document.getElementById('campoBusca');
var filtroData         = document.getElementById('filtroData');
var filtroMin          = document.getElementById('filtroMin');
var filtroMax          = document.getElementById('filtroMax');
var painelFiltros      = document.getElementById('painelFiltros');
var botaoFiltro        = document.getElementById('botaoFiltro');
var botaoLimparFiltros = document.getElementById('botaoLimparFiltros');

var botaoNovaDespesa   = document.getElementById('botaoNovaDespesa');
var fundoModal         = document.getElementById('fundoModal');
var tituloModal        = document.getElementById('tituloModal');
var botaoCancelar      = document.getElementById('botaoCancelar');
var botaoCadastrar     = document.getElementById('botaoCadastrar');

var campTipo           = document.getElementById('campTipo');
var campValor          = document.getElementById('campValor');
var campData           = document.getElementById('campData');
var campDescricao      = document.getElementById('campDescricao');
var contadorCaracteres = document.getElementById('contadorCaracteres');
var erroTipo           = document.getElementById('erroTipo');
var erroValor          = document.getElementById('erroValor');
var erroData           = document.getElementById('erroData');

var fundoModalExcluir      = document.getElementById('fundoModalExcluir');
var botaoCancelarExclusao  = document.getElementById('botaoCancelarExclusao');
var botaoConfirmarExclusao = document.getElementById('botaoConfirmarExclusao');


/*
   UTILITÁRIOS
*/
/* Formata número para moeda brasileira: 1234.5 → "R$ 1.234,50" */
function formatarBRL(valor) {
  return 'R$ ' + (valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* Converte data ISO (2026-04-04) para formato BR (04/04/2026) */
function formatarDataBR(dataISO) {
  if (!dataISO) return '';
  var partes = dataISO.split('-');
  if (partes.length !== 3) return dataISO;
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

/* Escapa HTML para evitar XSS ao inserir texto via innerHTML */
function escaparHTML(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


/*
   FILTROS
   Retorna a lista de despesas filtrada conforme o que
   o usuário digitou na busca e nos campos de filtro.
*/
function obterDespesasFiltradas() {
  var busca  = campoBusca.value.trim().toLowerCase();
  var porData = filtroData.value;
  var minVal  = parseFloat(filtroMin.value) || 0;
  var maxVal  = parseFloat(filtroMax.value) || Infinity;

  return despesas.filter(function(d) {
    var bateBusca = !busca ||
      d.tipo.toLowerCase().includes(busca) ||
      (d.descricao && d.descricao.toLowerCase().includes(busca));

    var bateData = !porData || d.data === porData;
    var bateMin  = d.valor >= minVal;
    var bateMax  = maxVal === Infinity || d.valor <= maxVal;

    return bateBusca && bateData && bateMin && bateMax;
  });
}


/*
   RENDERIZAÇÃO
   Atualiza os cards de resumo e a tabela com os dados
   atuais. Chamada sempre que algo muda (cadastro, edição,
   exclusão, busca ou filtro).
 */
function renderizar() {
  var filtradas = obterDespesasFiltradas();

  /* Cards de resumo — calculados sobre TODAS as despesas,
     não só as filtradas, para o total não mudar ao buscar */
  var total = despesas.reduce(function(acc, d) { return acc + d.valor; }, 0);
  var media = despesas.length ? total / despesas.length : 0;
  var qtd   = despesas.length;

  totalMensal.textContent        = formatarBRL(total);
  mediaDespesas.textContent      = formatarBRL(media);
  quantidadeDespesas.textContent = qtd + ' despesa' + (qtd !== 1 ? 's' : '') +
    ' registrada' + (qtd !== 1 ? 's' : '');

  /* Tabela */
  tabelaCorpo.innerHTML = '';

  if (filtradas.length === 0) {
    /* Sem resultados: esconde tabela e exibe aviso */
    tabelaDespesas.style.display = 'none';
    avisoVazio.style.display     = 'block';
    avisoVazio.textContent       = despesas.length === 0
      ? 'Nenhuma despesa cadastrada ainda.'
      : 'Nenhuma despesa encontrada para essa busca.';
  } else {
    /* Com resultados: exibe tabela e esconde aviso */
    tabelaDespesas.style.display = 'table';
    avisoVazio.style.display     = 'none';

    filtradas.forEach(function(d) {
      var linha = document.createElement('tr');
      linha.innerHTML =
        '<td><span class="tag-tipo">' + escaparHTML(d.tipo) + '</span></td>' +
        '<td>' + formatarBRL(d.valor) + '</td>' +
        '<td>' + escaparHTML(d.descricao || '—') + '</td>' +
        '<td>' + formatarDataBR(d.data) + '</td>' +
        '<td>' +
          '<div class="coluna-acoes">' +
            '<button class="botao-acao editar" data-id="' + d.id + '" title="Editar">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
                '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' +
              '</svg>' +
            '</button>' +
            '<button class="botao-acao excluir" data-id="' + d.id + '" title="Excluir">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<polyline points="3 6 5 6 21 6"/>' +
                '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
                '<path d="M10 11v6"/><path d="M14 11v6"/>' +
                '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
        '</td>';
      tabelaCorpo.appendChild(linha);
    });
  }
}


/*
   PAINEL DE FILTROS
   Abre e fecha ao clicar no botão "Filtro".
*/
botaoFiltro.addEventListener('click', function() {
  painelFiltros.classList.toggle('aberto');
  botaoFiltro.classList.toggle('aberto');
});

/* Limpa os três campos de filtro e re-renderiza */
botaoLimparFiltros.addEventListener('click', function() {
  filtroData.value = '';
  filtroMin.value  = '';
  filtroMax.value  = '';
  renderizar();
});

/* Qualquer alteração nos campos atualiza a tabela imediatamente */
[campoBusca, filtroData, filtroMin, filtroMax].forEach(function(campo) {
  campo.addEventListener('input', renderizar);
});


/*
   MODAL DE NOVA DESPESA / EDIÇÃO
*/
/* Abre o modal. Recebe uma despesa para editar, ou null
   para criar uma nova. */
function abrirModal(despesa) {
  limparErros();

  if (despesa) {
    /* Modo edição — preenche os campos */
    idEmEdicao                 = despesa.id;
    tituloModal.textContent    = 'Editar Despesa';
    botaoCadastrar.textContent = 'Salvar';
    campTipo.value             = despesa.tipo;
    campValor.value            = despesa.valor;
    campData.value             = despesa.data;
    campDescricao.value        = despesa.descricao || '';
  } else {
    /* Modo criação — limpa os campos */
    idEmEdicao                 = null;
    tituloModal.textContent    = 'Nova Despesa';
    botaoCadastrar.textContent = 'Cadastrar';
    campTipo.value             = '';
    campValor.value            = '';
    campData.value             = '';
    campDescricao.value        = '';
  }

  atualizarContador();
  fundoModal.classList.add('aberto');
  campTipo.focus();
}

function fecharModal() {
  fundoModal.classList.remove('aberto');
  idEmEdicao = null;
}

/* Atualiza o contador de caracteres da textarea */
campDescricao.addEventListener('input', atualizarContador);

function atualizarContador() {
  contadorCaracteres.textContent = campDescricao.value.length + '/255 caracteres';
}

/* Abre modal de criação ao clicar no botão */
botaoNovaDespesa.addEventListener('click', function() { 
  console.log('Botão nova despesa clicado');
  abrirModal(null); 
});

/* Fecha ao clicar em Cancelar ou fora da caixa do modal */
botaoCancelar.addEventListener('click', fecharModal);
fundoModal.addEventListener('click', function(e) {
  if (e.target === fundoModal) fecharModal();
});


/* 
   VALIDAÇÃO DO FORMULÁRIO
 */
function limparErros() {
  erroTipo.textContent  = '';
  erroValor.textContent = '';
  erroData.textContent  = '';
  [campTipo, campValor, campData].forEach(function(campo) {
    campo.classList.remove('invalido');
  });
}

function validarFormulario() {
  limparErros();
  var valido = true;

  if (!campTipo.value) {
    erroTipo.textContent = 'Selecione o tipo de despesa.';
    campTipo.classList.add('invalido');
    valido = false;
  }

  var valor = parseFloat(campValor.value);
  if (!campValor.value || isNaN(valor) || valor <= 0) {
    erroValor.textContent = 'Informe um valor maior que zero.';
    campValor.classList.add('invalido');
    valido = false;
  }

  if (!campData.value) {
    erroData.textContent = 'Informe a data da despesa.';
    campData.classList.add('invalido');
    valido = false;
  }

  return valido;
}


/* 
   CADASTRAR / SALVAR DESPESA
*/
botaoCadastrar.addEventListener('click', function() {
  if (!validarFormulario()) return;

  var payload = {
    tipo:      campTipo.value,
    valor:     parseFloat(parseFloat(campValor.value).toFixed(2)),
    data:      campData.value,
    descricao: campDescricao.value.trim()
  };

  if (idEmEdicao) {
    /* Edição — PUT ao backend */
    fetch(API_BASE + '/despesas/' + idEmEdicao, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Erro ao atualizar');
      return carregarDespesas();
    })
    .then(function(lista) {
      despesas = lista;
      fecharModal();
      renderizar();
    })
    .catch(function(err) {
      console.error(err);
     showError("Não foi possível salvar despesa.");
    });
  } else {
    /* Criação — POST ao backend */
    fetch(API_BASE + '/despesas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Erro ao criar');
      return carregarDespesas();
    })
    .then(function(lista) {
      despesas = lista;
      fecharModal();
      renderizar();
    })
    .catch(function(err) {
      console.error(err);
      showError("Não foi possível salvar despesa.");
    });
  }
});


/*
   CLIQUES NA TABELA (editar e excluir)
   Usa delegação de eventos: um único listener no tbody
   detecta cliques em qualquer botão das linhas.
*/
tabelaCorpo.addEventListener('click', function(e) {
  var botaoEditar  = e.target.closest('.botao-acao.editar');
  var botaoExcluir = e.target.closest('.botao-acao.excluir');

  if (botaoEditar) {
    var id      = parseInt(botaoEditar.getAttribute('data-id'));
    var despesa = despesas.find(function(d) { return d.id === id; });
    if (despesa) abrirModal(despesa);
  }

  if (botaoExcluir) {
    idEmExclusao = parseInt(botaoExcluir.getAttribute('data-id'));
    fundoModalExcluir.classList.add('aberto');
  }
});


/* 
   MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
*/
botaoCancelarExclusao.addEventListener('click', function() {
  fundoModalExcluir.classList.remove('aberto');
  idEmExclusao = null;
});

fundoModalExcluir.addEventListener('click', function(e) {
  if (e.target === fundoModalExcluir) {
    fundoModalExcluir.classList.remove('aberto');
    idEmExclusao = null;
  }
});

botaoConfirmarExclusao.addEventListener('click', function() {
  if (idEmExclusao !== null) {
    fetch(API_BASE + '/despesas/' + idEmExclusao, {
      method: 'DELETE'
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Erro ao deletar');
      return carregarDespesas();
    })
    .then(function(lista) {
      despesas = lista;
      idEmExclusao = null;
      fundoModalExcluir.classList.remove('aberto');
      renderizar();
    })
    .catch(function(err) {
      console.error(err);
      showError("Não foi possível excluir despesa.");
    });
  }
});


/* 
   TECLADO — ESC fecha qualquer modal aberto
 */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    fecharModal();
    fundoModalExcluir.classList.remove('aberto');
  }
});


/* 
   INICIALIZAÇÃO
*/
window.addEventListener('load', function() {
  carregarDespesas().then(function(lista) {
    despesas = lista;
    renderizar();
  }).catch(function(err) {
    console.error('Erro ao inicializar:', err);
    renderizar();
  });
});