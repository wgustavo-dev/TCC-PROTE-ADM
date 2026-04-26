console.log('presenca.old.js carregou');

let registros = [
  {
    id: 1,
    nome: 'João Silva',
    presente: true
  }
];

const campoData = document.getElementById('campoData');
const listaAlunos = document.getElementById('listaAlunosPresenca');
const totalPresentes = document.getElementById('totalPresentes');
const totalAusentes = document.getElementById('totalAusentes');
const taxaPresenca = document.getElementById('taxaPresenca');
const barraTaxa = document.getElementById('barraTaxaPreenchimento');
const textoDataLista = document.getElementById('textoDataLista');

const botaoMarcarTodos = document.getElementById('botaoMarcarTodos');
const botaoDesmarcarTodos = document.getElementById('botaoDesmarcarTodos');
const botaoSalvar = document.getElementById('botaoSalvarChamada');

function definirDataAtual() {
  const hoje = new Date().toISOString().split('T')[0];
  campoData.value = hoje;
}
/* */
function formatarDataBR(data) {
  if (!data) return '';
  const partes = data.split('-');
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function atualizarResumo() {
  const presentes = registros.filter((aluno) => aluno.presente).length;
  const ausentes = registros.length - presentes;
  const taxa = registros.length ? Math.round((presentes / registros.length) * 100) : 0;

  totalPresentes.textContent = presentes;
  totalAusentes.textContent = ausentes;
  taxaPresenca.textContent = `${taxa}.0%`;
  barraTaxa.style.width = `${taxa}%`;
}

function renderizarLista() {
  textoDataLista.textContent = `Registro de presença do dia ${formatarDataBR(campoData.value)}`;

  listaAlunos.innerHTML = registros.map((aluno) => `
    <div class="aluno-presenca">
      <div class="info-aluno-presenca">
        <div class="avatar-presenca">${aluno.nome.charAt(0)}</div>

        <div>
          <div class="nome-aluno-presenca">${aluno.nome}</div>
          <div class="id-aluno-presenca">ID: ${aluno.id}</div>
        </div>
      </div>

      <button 
        class="botao-status ${aluno.presente ? 'presente' : 'ausente'}"
        data-id="${aluno.id}"
      >
        ${aluno.presente ? 'Presente' : 'Ausente'}
      </button>
    </div>
  `).join('');
}

function atualizarTela() {
  renderizarLista();
  atualizarResumo();
}

listaAlunos.addEventListener('click', (event) => {
  const botao = event.target.closest('.botao-status');
  if (!botao) return;

  const id = Number(botao.dataset.id);

  registros = registros.map((aluno) =>
    aluno.id === id ? { ...aluno, presente: !aluno.presente } : aluno
  );

  atualizarTela();
});

botaoMarcarTodos.addEventListener('click', () => {
  registros = registros.map((aluno) => ({
    ...aluno,
    presente: true
  }));

  atualizarTela();
});

botaoDesmarcarTodos.addEventListener('click', () => {
  registros = registros.map((aluno) => ({
    ...aluno,
    presente: false
  }));

  atualizarTela();
});

campoData.addEventListener('change', () => {
  atualizarTela();
});

botaoSalvar.addEventListener('click', () => {
  alert('Registro da chamada salvo com sucesso!');
});

definirDataAtual();
atualizarTela();