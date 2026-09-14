(function () {
  'use strict';

  const ROTA_BUSCAR = '/itinerarios';
  const ROTA_SALVAR = '/itinerarios/ordem';

  const rotuloTipo = { ida: 'IDA', volta: 'VOLTA' };
  const rotuloPeriodo = { manha: 'matutino', tarde: 'vespertino', noite: 'noturno' };

  const iconeGrip = '<svg width="12" height="16" viewBox="0 0 12 16" fill="none"><circle cx="3" cy="2" r="1.4" fill="currentColor"/><circle cx="9" cy="2" r="1.4" fill="currentColor"/><circle cx="3" cy="8" r="1.4" fill="currentColor"/><circle cx="9" cy="8" r="1.4" fill="currentColor"/><circle cx="3" cy="14" r="1.4" fill="currentColor"/><circle cx="9" cy="14" r="1.4" fill="currentColor"/></svg>';
  const iconeUsuario = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor"/></svg>';

  const grid = document.getElementById('periodosGrid');
  const subtitulo = document.getElementById('itinerariosSubtitulo');
  const modoIndicador = document.getElementById('modoIndicador');
  const btnEditar = document.getElementById('btnEditarOrdem');
  const btnCancelar = document.getElementById('btnCancelarOrdem');
  const btnSalvar = document.getElementById('btnSalvarOrdem');
  const toast = document.getElementById('toast');

  let sortableInstances = [];
  let emEdicao = false;
  let filtroAtivo = 'todos';
  let estadoAntesDeEditar = null; // snapshot da ordem, usado pelo "Cancelar"

  /* =========================================================
     1) BUSCAR OS ALUNOS REAIS DO SISTEMA
     ========================================================= */
  async function buscarItinerario() {
    try {
      const dados = await window.API.get(ROTA_BUSCAR);
      renderizarTudo(dados);
    } catch (erro) {
      console.error('Erro ao carregar itinerários:', erro);
      // Mantém as colunas vazias (com o placeholder "Nenhum aluno neste período")
      // em vez de travar a tela — assim o painel continua utilizável.
      renderizarTudo({ manha: [], tarde: [], noite: [] });
    }
  }

  /* =========================================================
     2) RENDERIZAÇÃO
     ========================================================= */
  function renderizarAluno(item) {
    const li = document.createElement('li');
    li.className = 'aluno-item';
    li.dataset.itemId = item.itemId;   // entrada específica (ida OU volta)
    li.dataset.alunoId = item.alunoId; // aluno real (pode se repetir em 2 entradas)
    li.dataset.tipo = item.tipo;
    // Escola aparece antes do endereço, pra identificar o destino mais rápido
    // (útil quando o mesmo turno atende mais de uma escola).
    const linhaSecundaria = item.escola ? (item.escola + ' • ' + item.endereco) : item.endereco;
    li.innerHTML =
      '<span class="drag-handle">' + iconeGrip + '</span>' +
      '<span class="ordem-badge">0</span>' +
      '<span class="aluno-avatar">' + iconeUsuario + '</span>' +
      '<span class="aluno-info">' +
        '<span class="aluno-nome">' + item.nome + '</span>' +
        '<span class="aluno-endereco">' + linhaSecundaria + '</span>' +
      '</span>' +
      '<span class="tipo-badge tipo-badge--' + item.tipo + '">' + rotuloTipo[item.tipo] + '</span>';
    return li;
  }

  function renderizarTudo(dados) {
    ['manha', 'tarde', 'noite'].forEach(periodo => {
      const lista = document.querySelector('.aluno-lista[data-periodo="' + periodo + '"]');
      lista.innerHTML = '';
      (dados[periodo] || []).forEach(item => lista.appendChild(renderizarAluno(item)));
    });
    atualizarContadoresEOrdens();
    inicializarSortable();
  }

  /* =========================================================
     3) DRAG AND DROP — travado por padrão
     ========================================================= */
  function inicializarSortable() {
    // evita duplicar instâncias se renderizarTudo rodar de novo
    sortableInstances.forEach(s => s.destroy());
    sortableInstances = [];

    document.querySelectorAll('.aluno-lista').forEach(lista => {
      const instancia = new Sortable(lista, {
        group: 'itinerario-alunos',
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'aluno-ghost',
        chosenClass: 'aluno-chosen',
        dragClass: 'aluno-drag',
        disabled: !emEdicao, // só arrasta em modo de edição
        onEnd: atualizarContadoresEOrdens,
      });
      sortableInstances.push(instancia);
    });
  }

  function atualizarContadoresEOrdens() {
    document.querySelectorAll('.aluno-lista').forEach(lista => {
      const periodo = lista.dataset.periodo;
      const itens = lista.querySelectorAll('.aluno-item');
      itens.forEach((item, index) => {
        item.querySelector('.ordem-badge').textContent = index + 1;
      });
      document.querySelector('[data-contagem="' + periodo + '"]').textContent =
        itens.length + ' aluno' + (itens.length === 1 ? '' : 's');
    });
  }

  /* =========================================================
     4) EXTRAIR / RESTAURAR ORDEM
     ========================================================= */
  function extrairItinerarios() {
    const resultado = {};
    document.querySelectorAll('.aluno-lista').forEach(lista => {
      const periodo = lista.dataset.periodo;
      resultado[periodo] = Array.from(lista.querySelectorAll('.aluno-item')).map((item, index) => ({
        itemId: item.dataset.itemId,
        alunoId: Number(item.dataset.alunoId),
        ordem: index + 1,
        tipo: item.dataset.tipo,
      }));
    });
    return resultado;
  }

  function capturarOrdemAtual() {
    const mapa = {};
    document.querySelectorAll('.aluno-lista').forEach(lista => {
      mapa[lista.dataset.periodo] = Array.from(lista.querySelectorAll('.aluno-item')).map(el => el.dataset.itemId);
    });
    return mapa;
  }

  function restaurarOrdem(mapaOrdem) {
    Object.entries(mapaOrdem).forEach(([periodo, ordemItemIds]) => {
      const lista = document.querySelector('.aluno-lista[data-periodo="' + periodo + '"]');
      ordemItemIds.forEach(itemId => {
        const elemento = lista.querySelector('[data-item-id="' + itemId + '"]');
        if (elemento) lista.appendChild(elemento); // appendChild move o nó existente, não duplica
      });
    });
    atualizarContadoresEOrdens();
  }

  /* =========================================================
     5) MODO TRAVADO x MODO DE EDIÇÃO
     ========================================================= */
  function aplicarModo() {
    grid.classList.toggle('modo-edicao', emEdicao);
    btnEditar.hidden = emEdicao;
    btnCancelar.hidden = !emEdicao;
    btnSalvar.hidden = !emEdicao;

    modoIndicador.textContent = emEdicao ? '✏️ Editando ordem' : '🔒 Somente visualização';
    modoIndicador.classList.toggle('modo-indicador--edicao', emEdicao);

    sortableInstances.forEach(s => s.option('disabled', !emEdicao));
    atualizarSubtitulo();
  }

  function atualizarSubtitulo() {
    if (emEdicao) {
      subtitulo.textContent = filtroAtivo === 'todos'
        ? 'Arraste e solte para reordenar os alunos e seus períodos'
        : 'Arraste e solte para reordenar os alunos do período ' + rotuloPeriodo[filtroAtivo];
    } else {
      subtitulo.textContent = filtroAtivo === 'todos'
        ? 'Ordem atual dos alunos por período'
        : 'Ordem atual do período ' + rotuloPeriodo[filtroAtivo];
    }
  }

  btnEditar.addEventListener('click', () => {
    estadoAntesDeEditar = capturarOrdemAtual();
    emEdicao = true;
    aplicarModo();
  });

  btnCancelar.addEventListener('click', () => {
    if (estadoAntesDeEditar) restaurarOrdem(estadoAntesDeEditar);
    emEdicao = false;
    aplicarModo();
  });

  btnSalvar.addEventListener('click', async () => {
    const payload = extrairItinerarios();
    const textoOriginal = btnSalvar.textContent;
    btnSalvar.disabled = true;
    btnSalvar.textContent = 'Salvando...';

    try {
      await window.API.put(ROTA_SALVAR, payload);

      mostrarToast('Ordem salva com sucesso!');
      emEdicao = false;
      aplicarModo();
    } catch (erro) {
      console.error('Erro ao salvar ordem:', erro);
      mostrarToast('Não foi possível salvar. Tente novamente.');
    } finally {
      btnSalvar.disabled = false;
      btnSalvar.textContent = textoOriginal;
    }
  });

  function mostrarToast(texto) {
    toast.textContent = texto;
    toast.classList.add('visivel');
    clearTimeout(mostrarToast._t);
    mostrarToast._t = setTimeout(() => toast.classList.remove('visivel'), 2200);
  }

  /* =========================================================
     6) FILTRO POR PERÍODO (Todos / Manhã / Tarde / Noite)
     ========================================================= */
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('filtro-ativo'));
      btn.classList.add('filtro-ativo');

      filtroAtivo = btn.dataset.filtro;
      document.querySelectorAll('.periodo-coluna').forEach(coluna => {
        const mostrar = filtroAtivo === 'todos' || coluna.dataset.periodo === filtroAtivo;
        coluna.classList.toggle('oculto', !mostrar);
        if (mostrar && filtroAtivo !== 'todos') coluna.classList.remove('recolhido');
      });

      grid.classList.toggle('grid--unico', filtroAtivo !== 'todos');
      atualizarSubtitulo();
    });
  });

  /* =========================================================
     7) ACORDEÃO NO MOBILE
     ========================================================= */
  document.querySelectorAll('.periodo-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.periodo-coluna').classList.toggle('recolhido');
    });
  });

  /* =========================================================
     8) INICIALIZAÇÃO
     ========================================================= */
  buscarItinerario();
})();