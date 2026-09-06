(() => {
  "use strict";

  const TURNOS = ["MANHA", "TARDE", "NOITE"];
  const ROTULO_TIPO = { ida: "Ida", volta: "Volta" };

  let turnoAtivo = "MANHA";

  // Cada item representa UMA entrada da chamada (aluno + tipo), com seu
  // próprio status e observação — nunca deduplicado por alunoId, porque
  // um mesmo aluno pode ter uma entrada de IDA e outra de VOLTA no
  // mesmo turno (ex.: TARDE).
  let itensChamada = [];

  const pesquisasPresenca = {
    ida: "",
    volta: "",
  };

  let linhaTrajetoAtual = {
    data: "",
    turno: "MANHA",
    alunos: [],
  };

  // Quantos alunos da rota já foram percorridos.
  let progressoLinha = 0;

  const campoData = document.getElementById("campoData");
  const listaAlunos = document.getElementById("listaAlunosPresenca");
  const totalPresentes = document.getElementById("totalPresentes");
  const totalAusentes = document.getElementById("totalAusentes");
  const taxaPresenca = document.getElementById("taxaPresenca");
  const barraTaxa = document.getElementById("barraTaxaPreenchimento");
  const textoDataLista = document.getElementById("textoDataLista");
  const botaoMarcarTodos = document.getElementById("botaoMarcarTodos");
  const botaoDesmarcarTodos = document.getElementById("botaoDesmarcarTodos");
  const presencaTurnos = document.getElementById("presencaTurnos");
  const trajetoBadge = document.getElementById("trajetoBadgeAlunos");
  const trajetoLinha = document.getElementById("trajetoLinha");
  const avisoTextoLista = document.getElementById("avisoTextoLista");

  // ============================================================
  // MENU
  // ============================================================

  function initMenu() {
    const botaoMenu = document.getElementById("botaoMenu");
    const sidebar = document.getElementById("sidebar");
    const fundoEscuro = document.getElementById("fundoEscuro");

    if (!botaoMenu || !sidebar || !fundoEscuro) {
      return;
    }

    botaoMenu.addEventListener("click", () => {
      sidebar.classList.toggle("aberta");
      fundoEscuro.classList.toggle("visivel");
    });

    fundoEscuro.addEventListener("click", () => {
      sidebar.classList.remove("aberta");
      fundoEscuro.classList.remove("visivel");
    });
  }

  // ============================================================
  // DATA
  // ============================================================

  function definirDataAtual() {
    if (!campoData) {
      return;
    }

    const hoje = new Date();

    const hojeISO = [
      hoje.getFullYear(),
      String(hoje.getMonth() + 1).padStart(2, "0"),
      String(hoje.getDate()).padStart(2, "0"),
    ].join("-");

    campoData.max = hojeISO;
    campoData.value = hojeISO;
  }

  function dataEhFutura(data) {
    return Boolean(data && campoData?.max && data > campoData.max);
  }

  function formatarDataBR(data) {
    if (!data) {
      return "";
    }

    const partes = data.split("-");

    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
  }

  function rotuloTurno(turno) {
    return {
      MANHA: "Manhã",
      TARDE: "Tarde",
      NOITE: "Noite",
    }[turno] || turno;
  }

  function atualizarBotoesTurno() {
    document.querySelectorAll(".presenca-turno").forEach((botao) => {
      botao.classList.toggle("ativo", botao.dataset.turno === turnoAtivo);
    });
  }

  // ============================================================
  // LOCALSTORAGE (progresso da rota)
  // ============================================================

  function getChaveProgresso() {
    const data = campoData.value || new Date().toISOString().split("T")[0];
    return `prote_linha_trajeto_${data}_${turnoAtivo}`;
  }

  function carregarProgressoLocalStorage() {
    try {
      const chave = getChaveProgresso();
      const dados = localStorage.getItem(chave);

      if (!dados) {
        progressoLinha = 0;
        return;
      }

      const parsed = JSON.parse(dados);

      if (typeof parsed === "number" && Number.isFinite(parsed)) {
        progressoLinha = Math.max(0, Math.floor(parsed));
        return;
      }

      if (Array.isArray(parsed)) {
        progressoLinha = parsed.length;
        return;
      }

      progressoLinha = 0;
    } catch (erro) {
      console.warn("Erro ao carregar progresso:", erro);
      progressoLinha = 0;
    }
  }

  function salvarProgressoLocalStorage() {
    try {
      const chave = getChaveProgresso();
      localStorage.setItem(chave, JSON.stringify(progressoLinha));
    } catch (erro) {
      console.warn("Erro ao salvar progresso:", erro);
    }
  }

  // ============================================================
  // CARREGAR ITENS DO ITINERÁRIO DO TURNO
  // ============================================================
  //
  // IMPORTANTE: aqui NÃO deduplicamos por alunoId. Cada entrada do
  // itinerário (itemId + alunoId + tipo + ordem) é uma linha de chamada
  // independente — a rota física pode conter o mesmo aluno duas vezes
  // (uma vez como IDA, outra como VOLTA) no mesmo turno.

  async function carregarItensItinerario() {
    const resposta = await window.API.get("/itinerarios");

    if (!resposta || typeof resposta !== "object") {
      return [];
    }

    const chaveTurno = turnoAtivo.toLowerCase();
    const itens = Array.isArray(resposta[chaveTurno]) ? resposta[chaveTurno] : [];

    return itens
      .map((item) => {
        const alunoId = Number(item.alunoId ?? item.id_aluno ?? item.id);
        const tipo = String(item.tipo || "ida").toLowerCase();

        if (!Number.isFinite(alunoId) || !item.itemId) {
          return null;
        }

        return {
          itemId: String(item.itemId),
          alunoId,
          nome: item.nome || "Aluno",
          foto: item.foto || null,
          escola: item.escola || null,
          tipo,
          ordem: Number.isFinite(Number(item.ordem)) ? Number(item.ordem) : Number.MAX_SAFE_INTEGER,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.ordem - b.ordem);
  }

  // ============================================================
  // CARREGAR PRESENÇAS DO TURNO (todos os tipos de uma vez)
  // ============================================================

  async function carregarPresencasTurno() {
    const resposta = await window.API.get(
      `/presencas/data/${encodeURIComponent(campoData.value)}/turno/${encodeURIComponent(turnoAtivo)}`
    );

    return Array.isArray(resposta) ? resposta : [];
  }

  // ============================================================
  // CARREGAR LINHA DE TRAJETO
  // ============================================================

  async function carregarLinhaTrajeto() {
    const resposta = await window.API.get(
      `/linha-trajeto?data=${encodeURIComponent(campoData.value)}&turno=${encodeURIComponent(turnoAtivo)}`
    );

    if (!resposta || !Array.isArray(resposta.alunos)) {
      return {
        data: campoData.value,
        turno: turnoAtivo,
        alunos: [],
      };
    }

    const alunosNormalizados = resposta.alunos
      .map((item, index) => {
        const alunoId = Number(item.alunoId ?? item.id_aluno ?? item.id);

        if (!item.itemId || !Number.isFinite(alunoId)) {
          return null;
        }

        const ordem = Number(item.ordem);

        return {
          itemId: String(item.itemId),
          alunoId,
          nome: item.nome || "Aluno",
          foto: item.foto || null,
          escola: item.escola || null,
          tipo: String(item.tipo || "ida").toLowerCase(),
          ordem: Number.isFinite(ordem) ? ordem : index + 1,
        };
      })
      .filter(Boolean);

    return {
      ...resposta,
      data: resposta.data || campoData.value,
      turno: resposta.turno || turnoAtivo,
      alunos: alunosNormalizados,
    };
  }

  // ============================================================
  // MONTAR A CHAMADA (junta itinerário + presenças)
  // ============================================================
  //
  // SEM REGISTRO = PRESENTE. A chave de correspondência é
  // alunoId + tipo (nunca só alunoId), para não misturar a presença de
  // IDA com a de VOLTA do mesmo aluno.

  function montarChamada(itensItinerario, presencas) {
    const presencasPorChave = new Map();

    presencas.forEach((registro) => {
      const chave = `${Number(registro.id_aluno)}_${String(registro.tipo || "").toUpperCase()}`;
      presencasPorChave.set(chave, registro);
    });

    return itensItinerario.map((item) => {
      const chave = `${item.alunoId}_${item.tipo.toUpperCase()}`;
      const presenca = presencasPorChave.get(chave);

      return {
        ...item,
        idPresenca: presenca ? presenca.id_presenca : null,
        status: presenca && String(presenca.status).toUpperCase() === "AUSENTE" ? "AUSENTE" : "PRESENTE",
        observacao: presenca && presenca.observacao ? presenca.observacao : "",
        salvando: false,
      };
    });
  }

  // ============================================================
  // ATUALIZAR DADOS DA TELA (carga completa: troca de turno/data)
  // ============================================================

  async function atualizarDadosTela() {
    if (!campoData?.value) {
      return;
    }

    try {
      const [itensItinerario, presencas, linha] = await Promise.all([
        carregarItensItinerario(),
        carregarPresencasTurno(),
        carregarLinhaTrajeto(),
      ]);

      itensChamada = montarChamada(itensItinerario, presencas);
      linhaTrajetoAtual = linha;

      carregarProgressoLocalStorage();

      if (progressoLinha > linhaTrajetoAtual.alunos.length) {
        progressoLinha = linhaTrajetoAtual.alunos.length;
        salvarProgressoLocalStorage();
      }

      renderizarLista();
      atualizarResumo();
      renderizarLinhaTrajeto();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);

      itensChamada = [];

      linhaTrajetoAtual = {
        data: campoData.value,
        turno: turnoAtivo,
        alunos: [],
      };

      progressoLinha = 0;

      renderizarLista();
      atualizarResumo();
      renderizarLinhaTrajeto();

      showError(error.message || "Não foi possível carregar os dados.");
    }
  }

  // Recarrega só a Linha de Trajeto (usada após cada alteração de
  // presença), sem tocar na lista de chamada nem exigir refresh da
  // página.
  async function atualizarSomenteLinhaTrajeto() {
    try {
      linhaTrajetoAtual = await carregarLinhaTrajeto();

      if (progressoLinha > linhaTrajetoAtual.alunos.length) {
        progressoLinha = linhaTrajetoAtual.alunos.length;
        salvarProgressoLocalStorage();
      }

      renderizarLinhaTrajeto();
    } catch (error) {
      console.error("Erro ao atualizar a Linha de Trajeto:", error);
      showError(error.message || "Não foi possível atualizar a Linha de Trajeto.");
    }
  }

  // ============================================================
  // RESUMO
  // ============================================================

  function atualizarResumo() {
    const presentes = itensChamada.filter((item) => item.status === "PRESENTE").length;
    const ausentes = itensChamada.length - presentes;
    const taxa = itensChamada.length ? (presentes / itensChamada.length) * 100 : 0;

    if (totalPresentes) {
      totalPresentes.textContent = String(presentes);
    }

    if (totalAusentes) {
      totalAusentes.textContent = String(ausentes);
    }

    if (taxaPresenca) {
      taxaPresenca.textContent = `${taxa.toFixed(1)}%`;
    }

    if (barraTaxa) {
      barraTaxa.style.width = `${taxa}%`;
    }
  }

  // ============================================================
  // LISTA DE CHAMADA
  // ============================================================

  function normalizarTextoPesquisa(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function escaparAtributoHTML(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function linhaAlunoHTML(item) {
    const desabilitado = item.salvando ? "disabled" : "";

    const observacaoHTML =
      item.status === "AUSENTE"
        ? `
          <textarea
            class="campo-observacao"
            data-item-id="${item.itemId}"
            placeholder="Observação (opcional). Ex.: Não volta com a gente hoje porque o pai buscou."
            ${desabilitado}
          >${item.observacao || ""}</textarea>
        `
        : "";

    return `
      <div class="aluno-presenca" data-nome-pesquisa="${escaparAtributoHTML(normalizarTextoPesquisa(item.nome))}">
        <div class="linha-principal-presenca">
          <div class="info-aluno-presenca">
            <div class="avatar-presenca">
              ${String(item.nome).charAt(0).toUpperCase()}
            </div>

            <div>
              <div class="nome-aluno-presenca">
                ${item.nome}
              </div>

              ${
                item.escola
                  ? `<div class="escola-aluno-presenca">${item.escola}</div>`
                  : ""
              }
            </div>
          </div>

          <button
            type="button"
            class="botao-status ${item.status === "PRESENTE" ? "presente" : "ausente"}"
            data-item-id="${item.itemId}"
            ${desabilitado}
          >
            ${item.status === "PRESENTE" ? "Presente" : "Ausente"}
          </button>
        </div>

        ${observacaoHTML}
      </div>
    `;
  }

  function blocoChamadaHTML(titulo, itens, chavePesquisa, aviso) {
    return `
      <div class="bloco-chamada" data-bloco-pesquisa="${chavePesquisa}">
        <div class="cabecalho-bloco-chamada">
          ${
            titulo
              ? `<div class="titulo-bloco-grupo">
                  <h3 class="titulo-bloco-chamada">${titulo}</h3>
                  ${aviso ? `<p class="aviso-chamada">${aviso}</p>` : ""}
                </div>`
              : ""
          }
          <div class="campo-busca pesquisa-presenca">
            <span class="sr-only">Pesquisar aluno por nome</span>
            <svg class="icone-busca" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              class="input-busca"
              data-chave-pesquisa="${chavePesquisa}"
              value="${escaparAtributoHTML(pesquisasPresenca[chavePesquisa])}"
              placeholder="Buscar por aluno..."
              autocomplete="off"
            />
          </div>
        </div>
        ${itens.map(linhaAlunoHTML).join("")}
        <p class="lista-vazia-presenca pesquisa-sem-resultado" data-pesquisa-vazia="${chavePesquisa}" hidden>
          Nenhum aluno encontrado com esse nome.
        </p>
      </div>
    `;
  }

  function aplicarPesquisaPresenca(chavePesquisa) {
    if (!listaAlunos) {
      return;
    }

    const bloco = listaAlunos.querySelector(`[data-bloco-pesquisa="${chavePesquisa}"]`);

    if (!bloco) {
      return;
    }

    const termo = normalizarTextoPesquisa(pesquisasPresenca[chavePesquisa]);
    let quantidadeVisivel = 0;

    bloco.querySelectorAll(".aluno-presenca").forEach((aluno) => {
      const corresponde = !termo || aluno.dataset.nomePesquisa.includes(termo);
      aluno.hidden = !corresponde;
      quantidadeVisivel += corresponde ? 1 : 0;
    });

    const mensagemVazia = bloco.querySelector(`[data-pesquisa-vazia="${chavePesquisa}"]`);

    if (mensagemVazia) {
      mensagemVazia.hidden = quantidadeVisivel > 0;
    }
  }

  function renderizarLista() {
    if (textoDataLista) {
      textoDataLista.textContent = `Lista de presença do dia ${formatarDataBR(campoData.value)} — Turma da ${rotuloTurno(turnoAtivo)}`;
    }

    if (avisoTextoLista) {
      avisoTextoLista.textContent = {
        MANHA: "Faça essa chamada após recolher todos os alunos da turma da manhã!",
        TARDE: "",
        NOITE: "Faça essa chamada antes de iniciar o trajeto da noite!",
      }[turnoAtivo] || "";
      avisoTextoLista.hidden = !avisoTextoLista.textContent;
    }

    if (!listaAlunos) {
      return;
    }

    if (!itensChamada.length) {
      listaAlunos.innerHTML = `<p class="lista-vazia-presenca">
          Nenhum aluno cadastrado no itinerário deste turno.
        </p>`;

      return;
    }

    const itensVolta = itensChamada.filter((item) => item.tipo === "volta");
    const itensIda = itensChamada.filter((item) => item.tipo === "ida");

    // Só existem DUAS chamadas independentes (VOLTA e IDA) quando o
    // turno realmente mistura os dois tipos (caso típico da TARDE). Se
    // o turno tiver só um tipo (ex.: MANHÃ = só IDA), mostramos uma
    // única lista, sem cabeçalhos.
    if (itensVolta.length && itensIda.length) {
      listaAlunos.innerHTML =
        blocoChamadaHTML(
          turnoAtivo === "TARDE" ? "Turma da Tarde - Alunos que voltam para casa." : "Chamada — Volta",
          itensVolta,
          "volta",
          turnoAtivo === "TARDE" ? "Faça essa chamada antes de iniciar o trajeto da tarde!" : ""
        ) +
        blocoChamadaHTML(
          turnoAtivo === "TARDE" ? "Turma da Tarde - Alunos que vão para a escola." : "Chamada — Ida",
          itensIda,
          "ida",
          turnoAtivo === "TARDE" ? "Faça essa chamada após recolher todos os alunos da turma da tarde!" : ""
        );
      aplicarPesquisaPresenca("volta");
      aplicarPesquisaPresenca("ida");
      return;
    }

    const chavePesquisa = itensChamada[0]?.tipo === "volta" ? "volta" : "ida";
    listaAlunos.innerHTML = blocoChamadaHTML(null, itensChamada, chavePesquisa);
    aplicarPesquisaPresenca(chavePesquisa);
  }

  // ============================================================
  // CASA DA ROTA
  // ============================================================

  function paradaCasaHTML(titulo, classe = "") {
    return `
      <div class="trajeto-parada trajeto-parada--casa ${classe}">
        <div class="trajeto-parada-icone casa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 11l9-8 9 8"></path>
            <path d="M5 10v10h14V10"></path>
          </svg>
        </div>

        <div class="trajeto-parada-legenda">
          <span class="trajeto-parada-titulo">
            ${titulo}
          </span>
        </div>
      </div>
    `;
  }

  // ============================================================
  // ALUNO DA ROTA
  // ============================================================

  function paradaAlunoHTML(aluno, index, isPego, isProximo) {
    const ordem = Number(aluno.ordem) || index + 1;
    const numero = String(ordem).padStart(2, "0");

    const classes = ["trajeto-parada--aluno"];

    if (isPego) {
      classes.push("pego");
    }

    if (isProximo) {
      classes.push("atual");
    }

    const fotoHTML = aluno.foto
      ? `
          <img
            src="${aluno.foto}"
            alt="${aluno.nome}"
            class="trajeto-avatar-foto"
          />
        `
      : `
          <span class="trajeto-avatar-numero">
            ${numero}
          </span>
        `;

    return `
      <div
        class="trajeto-parada ${classes.join(" ")}"
        data-item-id="${aluno.itemId}"
        data-ordem="${ordem}"
      >
        <div class="trajeto-avatar">
          ${fotoHTML}
          <span class="trajeto-avatar-check" aria-label="Aluno pego">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m5 12 4 4L19 6"></path>
            </svg>
          </span>
        </div>

        <div class="trajeto-parada-legenda">
          <span class="trajeto-parada-titulo">
            ${aluno.nome}
          </span>

          ${
            aluno.escola
              ? `
                <span class="trajeto-parada-sub">
                  ${aluno.escola}
                </span>
              `
              : ""
          }

          <span class="tipo-badge tipo-badge--${aluno.tipo}">
            ${ROTULO_TIPO[aluno.tipo] || aluno.tipo}
          </span>

          ${
            isProximo
              ? `
                <span class="trajeto-badge proximo-badge">
                  PROXIMO
                </span>
              `
              : ""
          }
        </div>
      </div>
    `;
  }

  // ============================================================
  // AVANÇAR
  // ============================================================

  function avancarProgresso() {
    const alunos = Array.isArray(linhaTrajetoAtual.alunos) ? linhaTrajetoAtual.alunos : [];

    if (progressoLinha >= alunos.length) {
      return;
    }

    progressoLinha++;

    salvarProgressoLocalStorage();
    renderizarLinhaTrajeto();

    if (progressoLinha === alunos.length && typeof showSuccess === "function") {
      showSuccess(`Fim da linha: o turno da ${rotuloTurno(turnoAtivo).toLowerCase()} acabou.`);
    }
  }

  // ============================================================
  // VOLTAR
  // ============================================================

  function voltarProgresso() {
    if (progressoLinha <= 0) {
      return;
    }

    progressoLinha--;

    salvarProgressoLocalStorage();
    renderizarLinhaTrajeto();
  }

  function animarChegadaProximoAluno() {
    const alunos = Array.isArray(linhaTrajetoAtual.alunos) ? linhaTrajetoAtual.alunos : [];

    if (!trajetoLinha || progressoLinha >= alunos.length) {
      return;
    }

    trajetoLinha.classList.remove("animando-proximo");
    void trajetoLinha.offsetWidth;
    trajetoLinha.classList.add("animando-proximo");

    window.setTimeout(() => {
      trajetoLinha.classList.remove("animando-proximo");
    }, 700);
  }

  // ============================================================
  // RENDERIZAR LINHA DE TRAJETO
  // ============================================================

  function renderizarLinhaTrajeto() {
    if (!trajetoBadge || !trajetoLinha) {
      return;
    }

    trajetoLinha.dataset.turno = turnoAtivo;

    const alunos = Array.isArray(linhaTrajetoAtual.alunos) ? linhaTrajetoAtual.alunos : [];

    trajetoBadge.textContent = `${alunos.length} aluno${alunos.length === 1 ? "" : "s"}`;

    if (!alunos.length) {
      trajetoLinha.innerHTML = `<p class="trajeto-vazio">
          Nenhum aluno presente neste turno.
        </p>`;

      return;
    }

    const partes = [];

    // Casa de início
    const casaInicioClasse = progressoLinha > 0 ? "percorrido" : "";
    partes.push(paradaCasaHTML("Inicio da rota", casaInicioClasse));

    for (let i = 0; i < alunos.length; i++) {
      const aluno = alunos[i];
      const isPego = i < progressoLinha;
      const isProximo = i === progressoLinha;

      // Conector antes do aluno
      let conectorClasse = "trajeto-conector";
      if (i < progressoLinha) {
        conectorClasse += " percorrido";
      } else if (i === progressoLinha) {
        conectorClasse += " proximo";
      } else {
        conectorClasse += " futuro";
      }
      partes.push(`<div class="${conectorClasse}"></div>`);

      // Parada do aluno
      partes.push(paradaAlunoHTML(aluno, i, isPego, isProximo));
    }

    // Conector final
    const todosAtendidos = progressoLinha >= alunos.length;
    const conectorFinalClasse = todosAtendidos ? "trajeto-conector percorrido" : "trajeto-conector futuro";
    partes.push(`<div class="${conectorFinalClasse}"></div>`);

    // Casa de fim
    const casaFimClasse = todosAtendidos ? "percorrido" : "";
    partes.push(paradaCasaHTML(`Fim de rota (${rotuloTurno(turnoAtivo)})`, casaFimClasse));

    trajetoLinha.innerHTML = partes.join("");
  }

  // ============================================================
  // DUPLO CLIQUE NA LINHA DE TRAJETO
  // ============================================================

  function lidarComDuploClique(evento) {
    const parada = evento.target.closest(".trajeto-parada--aluno");

    if (!parada) {
      return;
    }

    const itemId = parada.dataset.itemId;

    if (!itemId) {
      return;
    }

    const alunos = Array.isArray(linhaTrajetoAtual.alunos) ? linhaTrajetoAtual.alunos : [];

    const indiceClicado = alunos.findIndex((aluno) => aluno.itemId === itemId);

    if (indiceClicado === -1) {
      return;
    }

    // REGRA DO AVANÇO: Se clicou duas vezes no próximo aluno, avança uma posição.
    if (indiceClicado === progressoLinha) {
      avancarProgresso();
      animarChegadaProximoAluno();
      return;
    }

    // REGRA DO RETORNO: Se clicou duas vezes no aluno imediatamente anterior, volta uma posição.
    if (indiceClicado === progressoLinha - 1) {
      voltarProgresso();
    }
  }

  // ============================================================
  // SALVAMENTO AUTOMÁTICO INDIVIDUAL
  // ============================================================
  //
  // Envia SOMENTE a alteração daquele aluno/tipo para o backend —
  // nunca reenvia a chamada inteira. Cria o registro se ainda não
  // existir (aluno "sem registro" = PRESENTE) ou atualiza o existente.

  async function salvarItem(item) {
    const payload = {
      id_aluno: item.alunoId,
      data: campoData.value,
      turno: turnoAtivo,
      tipo: item.tipo.toUpperCase(),
      status: item.status,
      observacao: item.status === "AUSENTE" ? item.observacao || "" : "",
    };

    if (item.idPresenca) {
      const atualizado = await window.API.put(`/presencas/${item.idPresenca}`, payload);
      item.idPresenca = atualizado?.id_presenca || item.idPresenca;
      return atualizado;
    }

    const criado = await window.API.post("/presencas", payload);

    if (criado?.id_presenca) {
      item.idPresenca = criado.id_presenca;
    }

    return criado;
  }

  function encontrarItemPorId(itemId) {
    return itensChamada.find((item) => item.itemId === itemId) || null;
  }

  // Alterna PRESENTE/AUSENTE de um único aluno: atualiza a interface
  // imediatamente, salva no backend imediatamente e atualiza a Linha
  // de Trajeto, sem recarregar a página.
  async function alternarStatus(itemId) {
    const item = encontrarItemPorId(itemId);

    if (!item || item.salvando) {
      return;
    }

    const statusAnterior = item.status;
    const observacaoAnterior = item.observacao;

    item.status = item.status === "PRESENTE" ? "AUSENTE" : "PRESENTE";

    // Ao voltar para PRESENTE, não faz sentido manter uma observação de
    // ausência pendurada na tela.
    if (item.status === "PRESENTE") {
      item.observacao = "";
    }

    item.salvando = true;

    renderizarLista();
    atualizarResumo();

    try {
      await salvarItem(item);
      item.salvando = false;
      renderizarLista();
      await atualizarSomenteLinhaTrajeto();
    } catch (error) {
      console.error("Erro ao salvar presença:", error);

      // Reverte a alteração otimista para não deixar a tela mostrando
      // um estado que não foi de fato salvo.
      item.status = statusAnterior;
      item.observacao = observacaoAnterior;
      item.salvando = false;

      renderizarLista();
      atualizarResumo();

      showError(error.message || "Não foi possível salvar a presença. Tente novamente.");
    }
  }

  // Salva a observação (só existe para alunos AUSENTES).
  async function salvarObservacao(itemId, texto) {
    const item = encontrarItemPorId(itemId);

    if (!item || item.status !== "AUSENTE") {
      return;
    }

    const observacaoAnterior = item.observacao;
    item.observacao = texto;
    item.salvando = true;

    try {
      await salvarItem(item);
      item.salvando = false;
    } catch (error) {
      console.error("Erro ao salvar observação:", error);

      item.observacao = observacaoAnterior;
      item.salvando = false;

      renderizarLista();

      showError(error.message || "Não foi possível salvar a observação. Tente novamente.");
    }
  }

  // ============================================================
  // EVENTOS DA LISTA DE CHAMADA
  // ============================================================

  if (listaAlunos) {
    listaAlunos.addEventListener("input", function (evento) {
      const campo = evento.target.closest(".input-busca");

      if (!campo) {
        return;
      }

      const chavePesquisa = campo.dataset.chavePesquisa;
      pesquisasPresenca[chavePesquisa] = campo.value;
      aplicarPesquisaPresenca(chavePesquisa);
    });

    listaAlunos.addEventListener("click", function (evento) {
      const botao = evento.target.closest(".botao-status");

      if (!botao) {
        return;
      }

      alternarStatus(botao.dataset.itemId);
    });

    // "focusout" (e não "blur") porque precisamos que o evento suba até
    // o container via delegação.
    listaAlunos.addEventListener("focusout", function (evento) {
      const campo = evento.target.closest(".campo-observacao");

      if (!campo) {
        return;
      }

      salvarObservacao(campo.dataset.itemId, campo.value);
    });
  }

  // ============================================================
  // MARCAR TODOS / DESMARCAR TODOS
  // ============================================================
  //
  // Não alteram mais só o estado local: cada aluno alterado é salvo
  // individualmente no backend, respeitando o mesmo mecanismo de
  // salvamento automático usado nos cliques individuais.

  async function definirTodos(novoStatus) {
    const alterados = itensChamada.filter((item) => item.status !== novoStatus);

    if (!alterados.length) {
      return;
    }

    alterados.forEach((item) => {
      item.status = novoStatus;
      if (novoStatus === "PRESENTE") {
        item.observacao = "";
      }
      item.salvando = true;
    });

    renderizarLista();
    atualizarResumo();

    const resultados = await Promise.allSettled(alterados.map((item) => salvarItem(item)));

    let algumFalhou = false;

    resultados.forEach((resultado, indice) => {
      alterados[indice].salvando = false;

      if (resultado.status === "rejected") {
        algumFalhou = true;
      }
    });

    renderizarLista();
    atualizarResumo();

    await atualizarSomenteLinhaTrajeto();

    if (algumFalhou) {
      showError("Algumas presenças não foram salvas. Verifique a lista e tente novamente.");
    }
  }

  if (botaoMarcarTodos) {
    botaoMarcarTodos.addEventListener("click", function () {
      definirTodos("PRESENTE");
    });
  }

  if (botaoDesmarcarTodos) {
    botaoDesmarcarTodos.addEventListener("click", function () {
      definirTodos("AUSENTE");
    });
  }

  // ============================================================
  // TROCA DE TURNO
  // ============================================================

  if (presencaTurnos) {
    presencaTurnos.addEventListener("click", async function (evento) {
      const botao = evento.target.closest(".presenca-turno");

      if (!botao) {
        return;
      }

      const novoTurno = String(botao.dataset.turno || "").toUpperCase();

      if (!TURNOS.includes(novoTurno) || novoTurno === turnoAtivo) {
        return;
      }

      turnoAtivo = novoTurno;

      atualizarBotoesTurno();

      await atualizarDadosTela();
    });
  }

  // ============================================================
  // MUDANÇA DE DATA
  // ============================================================

  if (campoData) {
    campoData.addEventListener("change", async function () {
      if (dataEhFutura(campoData.value)) {
        campoData.value = campoData.max;

        showError("Nao e possivel consultar ou criar uma presenca com data futura.");

        return;
      }

      await atualizarDadosTela();
    });
  }

  // ============================================================
  // CTRL + Z
  // ============================================================

  document.addEventListener("keydown", function (evento) {
    if (evento.ctrlKey && evento.key.toLowerCase() === "z") {
      evento.preventDefault();

      voltarProgresso();
    }
  });

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================

  window.addEventListener("DOMContentLoaded", async function () {
    initMenu();

    definirDataAtual();

    atualizarBotoesTurno();

    if (trajetoLinha) {
      trajetoLinha.addEventListener("dblclick", lidarComDuploClique);
    }

    await atualizarDadosTela();
  });
})();