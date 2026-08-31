(() => {
  "use strict";

  const TURNOS = ["MANHA", "TARDE", "NOITE"];

  let turnoAtivo = "MANHA";
  let registros = [];
  let registrosExistentes = [];

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
  const botaoSalvar = document.getElementById("botaoSalvarChamada");
  const presencaTurnos = document.getElementById("presencaTurnos");
  const trajetoBadge = document.getElementById("trajetoBadgeAlunos");
  const trajetoLinha = document.getElementById("trajetoLinha");

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
      MANHA: "manhã",
      TARDE: "tarde",
      NOITE: "noite",
    }[turno] || turno;
  }

  function atualizarBotoesTurno() {
    document.querySelectorAll(".presenca-turno").forEach((botao) => {
      botao.classList.toggle("ativo", botao.dataset.turno === turnoAtivo);
    });
  }

  // ============================================================
  // LOCALSTORAGE
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
  // CARREGAR ALUNOS DO TURNO
  // ============================================================

  async function carregarAlunosDoTurno() {
    const resposta = await window.API.get("/itinerarios");

    if (!resposta || typeof resposta !== "object") {
      return [];
    }

    const chaveTurno = turnoAtivo.toLowerCase();
    const itens = Array.isArray(resposta[chaveTurno]) ? resposta[chaveTurno] : [];
    const alunosPorId = new Map();

    for (const item of itens) {
      const id = Number(item.alunoId ?? item.id_aluno ?? item.id);

      if (!Number.isFinite(id)) {
        continue;
      }

      const ordem = Number(item.ordem);
      const existente = alunosPorId.get(id);

      const aluno = {
        id,
        nome: item.nome || item.aluno?.nome || "Aluno",
        foto: item.foto || item.aluno?.foto || null,
        escola: item.escola || item.aluno?.escola?.nome || null,
        ordem: Number.isFinite(ordem) ? ordem : Number.MAX_SAFE_INTEGER,
      };

      if (!existente || aluno.ordem < existente.ordem) {
        alunosPorId.set(id, aluno);
      }
    }

    return Array.from(alunosPorId.values()).sort((a, b) => {
      if (a.ordem !== b.ordem) {
        return a.ordem - b.ordem;
      }

      return String(a.nome).localeCompare(String(b.nome), "pt-BR");
    });
  }

  // ============================================================
  // CARREGAR PRESENÇAS
  // ============================================================

  async function carregarPresencas() {
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
      .map((aluno, index) => {
        const id = Number(aluno.id ?? aluno.alunoId ?? aluno.id_aluno);

        if (!Number.isFinite(id)) {
          return null;
        }

        const ordem = Number(aluno.ordem);

        return {
          ...aluno,
          id,
          alunoId: id,
          id_aluno: id,
          nome: aluno.nome || aluno.aluno?.nome || "Aluno",
          foto: aluno.foto || aluno.aluno?.foto || null,
          escola: aluno.escola || aluno.aluno?.escola?.nome || null,
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
  // ATUALIZAR DADOS DA TELA
  // ============================================================

  async function atualizarDadosTela() {
    if (!campoData?.value) {
      return;
    }

    try {
      const [alunos, presencas, linha] = await Promise.all([
        carregarAlunosDoTurno(),
        carregarPresencas(),
        carregarLinhaTrajeto(),
      ]);

      registrosExistentes = presencas;

      const statusPorAluno = new Map(
        presencas.map((item) => [Number(item.id_aluno), String(item.status || "").toUpperCase()])
      );

      registros = alunos.map((aluno) => ({
        ...aluno,
        presente: statusPorAluno.get(Number(aluno.id)) === "PRESENTE",
      }));

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

      registros = [];
      registrosExistentes = [];

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

  // ============================================================
  // RESUMO
  // ============================================================

  function atualizarResumo() {
    const presentes = registros.filter((aluno) => aluno.presente).length;
    const ausentes = registros.length - presentes;
    const taxa = registros.length ? (presentes / registros.length) * 100 : 0;

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

  function renderizarLista() {
    if (textoDataLista) {
      textoDataLista.textContent = `Registro de presença do dia ${formatarDataBR(campoData.value)} — ${rotuloTurno(turnoAtivo)}`;
    }

    if (!listaAlunos) {
      return;
    }

    if (!registros.length) {
      listaAlunos.innerHTML = `<p class="lista-vazia-presenca">
          Nenhum aluno cadastrado no itinerário deste turno.
        </p>`;

      return;
    }

    listaAlunos.innerHTML = registros
      .map(
        (aluno) => `
            <div class="aluno-presenca">
              <div class="info-aluno-presenca">
                <div class="avatar-presenca">
                  ${String(aluno.nome).charAt(0).toUpperCase()}
                </div>

                <div>
                  <div class="nome-aluno-presenca">
                    ${aluno.nome}
                  </div>

                  <div class="id-aluno-presenca">
                    ID: ${aluno.id}
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="botao-status ${aluno.presente ? "presente" : "ausente"}"
                data-id="${aluno.id}"
              >
                ${aluno.presente ? "Presente" : "Ausente"}
              </button>
            </div>
          `
      )
      .join("");
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
        data-id="${Number(aluno.id)}"
        data-ordem="${ordem}"
      >
        <div class="trajeto-avatar">
          ${fotoHTML}
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

          <span class="trajeto-ordem">
            Ordem ${numero}
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

  // ============================================================
  // RENDERIZAR LINHA DE TRAJETO
  // ============================================================

  function renderizarLinhaTrajeto() {
    if (!trajetoBadge || !trajetoLinha) {
      return;
    }

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

    const id = Number(parada.dataset.id);

    if (!Number.isFinite(id)) {
      return;
    }

    const alunos = Array.isArray(linhaTrajetoAtual.alunos) ? linhaTrajetoAtual.alunos : [];

    const indiceClicado = alunos.findIndex((aluno) => Number(aluno.id) === id);

    if (indiceClicado === -1) {
      return;
    }

    // REGRA DO AVANÇO: Se clicou duas vezes no próximo aluno, avança uma posição.
    if (indiceClicado === progressoLinha) {
      avancarProgresso();
      return;
    }

    // REGRA DO RETORNO: Se clicou duas vezes no aluno imediatamente anterior, volta uma posição.
    if (indiceClicado === progressoLinha - 1) {
      voltarProgresso();
    }
  }

  // ============================================================
  // EVENTOS DA LISTA DE CHAMADA
  // ============================================================

  if (listaAlunos) {
    listaAlunos.addEventListener("click", function (evento) {
      const botao = evento.target.closest(".botao-status");

      if (!botao) {
        return;
      }

      const id = Number(botao.dataset.id);

      registros = registros.map(function (aluno) {
        if (Number(aluno.id) === id) {
          return {
            ...aluno,
            presente: !aluno.presente,
          };
        }

        return aluno;
      });

      renderizarLista();
      atualizarResumo();
    });
  }

  // ============================================================
  // MARCAR TODOS
  // ============================================================

  if (botaoMarcarTodos) {
    botaoMarcarTodos.addEventListener("click", function () {
      registros = registros.map(function (aluno) {
        return {
          ...aluno,
          presente: true,
        };
      });

      renderizarLista();
      atualizarResumo();
    });
  }

  // ============================================================
  // DESMARCAR TODOS
  // ============================================================

  if (botaoDesmarcarTodos) {
    botaoDesmarcarTodos.addEventListener("click", function () {
      registros = registros.map(function (aluno) {
        return {
          ...aluno,
          presente: false,
        };
      });

      renderizarLista();
      atualizarResumo();
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
  // SALVAR CHAMADA
  // ============================================================

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", async function () {
      if (dataEhFutura(campoData.value)) {
        showError("Nao e possivel criar uma presenca com data futura.");

        return;
      }

      try {
        const existentesPorAluno = new Map(
          registrosExistentes.map(function (item) {
            return [Number(item.id_aluno), item];
          })
        );

        await Promise.all(
          registros.map(function (aluno) {
            const payload = {
              id_aluno: aluno.id,
              data: campoData.value,
              turno: turnoAtivo,
              status: aluno.presente ? "PRESENTE" : "AUSENTE",
            };

            const existente = existentesPorAluno.get(Number(aluno.id));

            if (existente && existente.id_presenca) {
              return window.API.put(`/presencas/${existente.id_presenca}`, payload);
            }

            return window.API.post("/presencas", payload);
          })
        );

        await atualizarDadosTela();

        showSuccess("Registro da chamada salvo com sucesso!");
      } catch (error) {
        console.error("Erro ao salvar:", error);

        showError(error.message || "Nao foi possivel salvar a chamada.");
      }
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