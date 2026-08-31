(() => {
  "use strict";

  const TURNOS = ["MANHA", "TARDE", "NOITE"];
  let turnoAtivo = "MANHA";
  let registros = [];
  let registrosExistentes = [];
  let linhaTrajetoAtual = { data: "", turno: "MANHA", alunos: [] };

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

  function initMenu() {
    const botaoMenu = document.getElementById("botaoMenu");
    const sidebar = document.getElementById("sidebar");
    const fundoEscuro = document.getElementById("fundoEscuro");

    if (!botaoMenu || !sidebar || !fundoEscuro) return;

    botaoMenu.addEventListener("click", () => {
      sidebar.classList.toggle("aberta");
      fundoEscuro.classList.toggle("visivel");
    });

    fundoEscuro.addEventListener("click", () => {
      sidebar.classList.remove("aberta");
      fundoEscuro.classList.remove("visivel");
    });
  }

  function definirDataAtual() {
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
    return Boolean(data && campoData.max && data > campoData.max);
  }

  function formatarDataBR(data) {
    if (!data) return "";
    const partes = data.split("-");
    return partes.length === 3
      ? `${partes[2]}/${partes[1]}/${partes[0]}`
      : data;
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

  async function carregarAlunosDoTurno() {
    const resposta = await window.API.get("/alunos");
    const alunos = Array.isArray(resposta) ? resposta : [];

    return alunos
      .filter((aluno) => String(aluno.turno || "").toUpperCase() === turnoAtivo)
      .map((aluno) => ({
        id: Number(aluno.id_aluno),
        nome: aluno.nome || "Aluno",
        foto: aluno.foto || null,
        escola: aluno.escola?.nome || null,
      }))
      .filter((aluno) => Number.isFinite(aluno.id));
  }

  async function carregarPresencas() {
    const resposta = await window.API.get(
      `/presencas/data/${encodeURIComponent(campoData.value)}/turno/${encodeURIComponent(turnoAtivo)}`
    );

    return Array.isArray(resposta) ? resposta : [];
  }

  async function carregarLinhaTrajeto() {
    const resposta = await window.API.get(
      `/linha-trajeto?data=${encodeURIComponent(campoData.value)}&turno=${encodeURIComponent(turnoAtivo)}`
    );

    return resposta && Array.isArray(resposta.alunos)
      ? resposta
      : { data: campoData.value, turno: turnoAtivo, alunos: [] };
  }

  async function atualizarDadosTela() {
    if (!campoData.value) return;

    try {
      const [alunos, presencas, linha] = await Promise.all([
        carregarAlunosDoTurno(),
        carregarPresencas(),
        carregarLinhaTrajeto(),
      ]);

      registrosExistentes = presencas;

      const statusPorAluno = new Map(
        presencas.map((item) => [
          Number(item.id_aluno),
          String(item.status || "").toUpperCase(),
        ])
      );

      registros = alunos.map((aluno) => ({
        ...aluno,
        presente: statusPorAluno.get(aluno.id) === "PRESENTE",
      }));

      linhaTrajetoAtual = linha;

      renderizarLista();
      atualizarResumo();
      renderizarLinhaTrajeto();
    } catch (error) {
      console.error("Erro ao carregar dados da Presença:", error);
      registros = [];
      registrosExistentes = [];
      linhaTrajetoAtual = {
        data: campoData.value,
        turno: turnoAtivo,
        alunos: [],
      };
      renderizarLista();
      atualizarResumo();
      renderizarLinhaTrajeto();
      showError(error.message || "Não foi possível carregar os dados da Presença.");
    }
  }

  function atualizarResumo() {
    const presentes = registros.filter((aluno) => aluno.presente).length;
    const ausentes = registros.length - presentes;
    const taxa = registros.length ? (presentes / registros.length) * 100 : 0;

    totalPresentes.textContent = String(presentes);
    totalAusentes.textContent = String(ausentes);
    taxaPresenca.textContent = `${taxa.toFixed(1)}%`;
    barraTaxa.style.width = `${taxa}%`;
  }

  function renderizarLista() {
    textoDataLista.textContent =
      `Registro de presença do dia ${formatarDataBR(campoData.value)} — ${rotuloTurno(turnoAtivo)}`;

    if (!registros.length) {
      listaAlunos.innerHTML =
        `<p class="lista-vazia-presenca">Nenhum aluno cadastrado para este turno.</p>`;
      return;
    }

    listaAlunos.innerHTML = registros
      .map(
        (aluno) => `
          <div class="aluno-presenca">
            <div class="info-aluno-presenca">
              <div class="avatar-presenca">${String(aluno.nome).charAt(0).toUpperCase()}</div>
              <div>
                <div class="nome-aluno-presenca">${aluno.nome}</div>
                <div class="id-aluno-presenca">ID: ${aluno.id}</div>
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

  function paradaCasaHTML(titulo) {
    return `
      <div class="trajeto-parada trajeto-parada--casa">
        <div class="trajeto-parada-icone casa">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 11l9-8 9 8"></path>
            <path d="M5 10v10h14V10"></path>
          </svg>
        </div>
        <div class="trajeto-parada-legenda">
          <span class="trajeto-parada-titulo">${titulo}</span>
        </div>
      </div>
    `;
  }

  function paradaAlunoHTML(aluno, index) {
    const ordem = Number(aluno.ordem) || index + 1;
    const numero = String(ordem).padStart(2, "0");

    return `
      <div class="trajeto-parada trajeto-parada--aluno">
        <div class="trajeto-avatar">
          <span class="trajeto-avatar-numero">${numero}</span>
        </div>
        <div class="trajeto-parada-legenda">
          <span class="trajeto-parada-titulo">${aluno.nome}</span>
          ${aluno.escola ? `<span class="trajeto-parada-sub">${aluno.escola}</span>` : ""}
          <span class="trajeto-ordem">Ordem ${numero}</span>
        </div>
      </div>
    `;
  }

  function renderizarLinhaTrajeto() {
    const alunos = Array.isArray(linhaTrajetoAtual.alunos)
      ? linhaTrajetoAtual.alunos
      : [];

    trajetoBadge.textContent =
      `${alunos.length} aluno${alunos.length === 1 ? "" : "s"}`;

    if (!alunos.length) {
      trajetoLinha.innerHTML =
        `<p class="trajeto-vazio">Nenhum aluno presente neste turno.</p>`;
      return;
    }

    const partes = [paradaCasaHTML("Início da rota")];

    alunos.forEach((aluno, index) => {
      partes.push('<div class="trajeto-conector percorrido"></div>');
      partes.push(paradaAlunoHTML(aluno, index));
    });

    partes.push('<div class="trajeto-conector percorrido"></div>');
    partes.push(paradaCasaHTML(`Fim de rota (${rotuloTurno(turnoAtivo)})`));

    trajetoLinha.innerHTML = partes.join("");
  }

  listaAlunos.addEventListener("click", (event) => {
    const botao = event.target.closest(".botao-status");
    if (!botao) return;

    const id = Number(botao.dataset.id);

    registros = registros.map((aluno) =>
      aluno.id === id
        ? { ...aluno, presente: !aluno.presente }
        : aluno
    );

    renderizarLista();
    atualizarResumo();
  });

  botaoMarcarTodos.addEventListener("click", () => {
    registros = registros.map((aluno) => ({
      ...aluno,
      presente: true,
    }));

    renderizarLista();
    atualizarResumo();
  });

  botaoDesmarcarTodos.addEventListener("click", () => {
    registros = registros.map((aluno) => ({
      ...aluno,
      presente: false,
    }));

    renderizarLista();
    atualizarResumo();
  });

  presencaTurnos.addEventListener("click", async (event) => {
    const botao = event.target.closest(".presenca-turno");
    if (!botao) return;

    const novoTurno = String(botao.dataset.turno || "").toUpperCase();

    if (!TURNOS.includes(novoTurno) || novoTurno === turnoAtivo) {
      return;
    }

    turnoAtivo = novoTurno;
    atualizarBotoesTurno();
    await atualizarDadosTela();
  });

  campoData.addEventListener("change", async () => {
    if (dataEhFutura(campoData.value)) {
      campoData.value = campoData.max;
      showError("Não é possível consultar ou criar uma presença com data futura.");
      return;
    }

    await atualizarDadosTela();
  });

  botaoSalvar.addEventListener("click", async () => {
    if (dataEhFutura(campoData.value)) {
      showError("Não é possível criar uma presença com data futura.");
      return;
    }

    try {
      const existentesPorAluno = new Map(
        registrosExistentes.map((item) => [Number(item.id_aluno), item])
      );

      await Promise.all(
        registros.map((aluno) => {
          const payload = {
            id_aluno: aluno.id,
            data: campoData.value,
            turno: turnoAtivo,
            status: aluno.presente ? "PRESENTE" : "AUSENTE",
          };

          const existente = existentesPorAluno.get(aluno.id);

          if (existente?.id_presenca) {
            return window.API.put(
              `/presencas/${existente.id_presenca}`,
              payload
            );
          }

          return window.API.post("/presencas", payload);
        })
      );

      await atualizarDadosTela();
      showSuccess("Registro da chamada salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar chamada:", error);
      showError(error.message || "Não foi possível salvar a chamada.");
    }
  });

  window.addEventListener("DOMContentLoaded", async () => {
    initMenu();
    definirDataAtual();
    atualizarBotoesTurno();
    await atualizarDadosTela();
  });
})();
