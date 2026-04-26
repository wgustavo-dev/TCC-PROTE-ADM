let alunos = [];
let el = null;

function initMenu() {
  // integração futura com menu global
}

async function carregarAlunos() {
  return [];
}
/* */
function configurarModal() {
  if (!el.btnAbrirModal) return;

  el.btnAbrirModal.addEventListener('click', abrirModalNovo);
  el.btnFecharModal.addEventListener('click', fecharModal);
  el.btnCancelar.addEventListener('click', fecharModal);

  el.modalOverlay.addEventListener('click', (event) => {
    if (event.target === el.modalOverlay) fecharModal();
  });
}

function configurarBusca() {
  el.inputBusca.addEventListener('input', renderizar);
}

function configurarMascaras() {
  const camposNome = [el.nomeAluno, el.nomeResponsavel1, el.nomeResponsavel2];
  const camposTelefone = [el.telefoneResponsavel1, el.telefoneResponsavel2];
  const camposEndereco = [el.enderecoEmbarque, el.enderecoDesembarque];

  camposNome.forEach((campo) => {
    if (!campo) return;
    campo.addEventListener('input', () => {
      campo.value = aplicarMascaraNome(campo.value);
    });
  });

  camposTelefone.forEach((campo) => {
    if (!campo) return;
    campo.addEventListener('input', () => {
      campo.value = aplicarMascaraTelefone(campo.value);
    });
  });

  camposEndereco.forEach((campo) => {
    if (!campo) return;
    campo.addEventListener('input', () => {
      campo.value = aplicarMascaraEndereco(campo.value);
    });
  });
}

function aplicarMascaraNome(valor) {
  return valor
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'\s-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 80);
}

function aplicarMascaraTelefone(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);

  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  if (numeros.length <= 10) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function aplicarMascaraEndereco(valor) {
  return valor
    .replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ.,º°ª\-\/\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 140);
}

function configurarPreviewFoto() {
  el.fotoAluno.addEventListener('change', () => {
    const arquivo = el.fotoAluno.files[0];

    if (!arquivo) {
      esconderPreviewFoto();
      return;
    }

    const leitor = new FileReader();
    leitor.onload = (evento) => {
      mostrarPreviewFoto(evento.target.result);
    };
    leitor.readAsDataURL(arquivo);
  });
}

function configurarFormulario() {
  el.formAluno.addEventListener('submit', (event) => {
    event.preventDefault();

    const payload = montarPayloadAluno();

    if (!payload.nome || !payload.responsavel1 || !payload.telefone1 || !payload.embarque || !payload.desembarque) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    if (!payload.id) {
      payload.id = Date.now();
      alunos.push(payload);
    } else {
      const index = alunos.findIndex((aluno) => String(aluno.id) === String(payload.id));
      if (index !== -1) alunos[index] = payload;
    }

    fecharModal();
    renderizar();
  });
}

function configurarTabela() {
  el.tbodyAlunos.addEventListener('click', (event) => {
    const botao = event.target.closest('button[data-action]');
    if (!botao) return;

    const action = botao.dataset.action;
    const id = botao.dataset.id;

    const aluno = alunos.find((item) => String(item.id) === String(id));
    if (!aluno) return;

    if (action === 'editar') {
      abrirModalEditar(aluno);
      return;
    }

    if (action === 'excluir') {
      const confirmar = confirm('Tem certeza que deseja excluir este aluno?');
      if (!confirmar) return;

      alunos = alunos.filter((item) => String(item.id) !== String(id));
      renderizar();
    }
  });
}

function montarPayloadAluno() {
  return {
    id: el.alunoId.value || null,
    nome: el.nomeAluno.value.trim(),
    responsavel1: el.nomeResponsavel1.value.trim(),
    telefone1: el.telefoneResponsavel1.value.trim(),
    responsavel2: el.nomeResponsavel2.value.trim(),
    telefone2: el.telefoneResponsavel2.value.trim(),
    embarque: el.enderecoEmbarque.value.trim(),
    desembarque: el.enderecoDesembarque.value.trim(),
    foto: el.previewFoto.src && el.previewFoto.src.includes('data:') ? el.previewFoto.src : null
  };
}

function obterAlunosFiltrados() {
  const busca = el.inputBusca.value.trim().toLowerCase();

  return alunos.filter((aluno) => {
    const texto = [
      aluno.nome,
      aluno.responsavel1,
      aluno.responsavel2,
      aluno.telefone1,
      aluno.telefone2,
      aluno.embarque,
      aluno.desembarque
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return !busca || texto.includes(busca);
  });
}

function renderizar() {
  const lista = obterAlunosFiltrados();
  renderizarTabela(lista);
}

function obterElementos() {
  return {
    btnAbrirModal: document.getElementById('btnAbrirModal'),
    btnFecharModal: document.getElementById('btnFecharModal'),
    btnCancelar: document.getElementById('btnCancelar'),
    modalOverlay: document.getElementById('modalOverlay'),

    formAluno: document.getElementById('formAluno'),
    alunoId: document.getElementById('alunoId'),
    nomeAluno: document.getElementById('nomeAluno'),
    nomeResponsavel1: document.getElementById('nomeResponsavel1'),
    telefoneResponsavel1: document.getElementById('telefoneResponsavel1'),
    nomeResponsavel2: document.getElementById('nomeResponsavel2'),
    telefoneResponsavel2: document.getElementById('telefoneResponsavel2'),
    enderecoEmbarque: document.getElementById('enderecoEmbarque'),
    enderecoDesembarque: document.getElementById('enderecoDesembarque'),
    fotoAluno: document.getElementById('fotoAluno'),

    previewFoto: document.getElementById('previewFoto'),
    avatarModalAluno: document.getElementById('avatarModalAluno'),

    inputBusca: document.getElementById('inputBusca'),
    tbodyAlunos: document.getElementById('tbodyAlunos'),
    emptyState: document.getElementById('emptyState'),
    modalTitulo: document.getElementById('modalTitulo')
  };
}

function abrirModalNovo() {
  el.modalTitulo.textContent = 'Novo aluno';
  el.formAluno.reset();
  el.alunoId.value = '';
  esconderPreviewFoto();
  el.modalOverlay.classList.remove('hidden');
}

function abrirModalEditar(aluno) {
  el.modalTitulo.textContent = 'Editar aluno';

  el.alunoId.value = aluno.id || '';
  el.nomeAluno.value = aplicarMascaraNome(aluno.nome || '');
  el.nomeResponsavel1.value = aplicarMascaraNome(aluno.responsavel1 || '');
  el.telefoneResponsavel1.value = aplicarMascaraTelefone(aluno.telefone1 || '');
  el.nomeResponsavel2.value = aplicarMascaraNome(aluno.responsavel2 || '');
  el.telefoneResponsavel2.value = aplicarMascaraTelefone(aluno.telefone2 || '');
  el.enderecoEmbarque.value = aplicarMascaraEndereco(aluno.embarque || '');
  el.enderecoDesembarque.value = aplicarMascaraEndereco(aluno.desembarque || '');

  if (aluno.foto) {
    mostrarPreviewFoto(aluno.foto);
  } else {
    esconderPreviewFoto();
  }

  el.modalOverlay.classList.remove('hidden');
}

function fecharModal() {
  el.modalOverlay.classList.add('hidden');
}

function mostrarPreviewFoto(src) {
  el.previewFoto.src = src;
  el.avatarModalAluno.classList.add('com-foto');
}

function esconderPreviewFoto() {
  el.previewFoto.src = '';
  el.avatarModalAluno.classList.remove('com-foto');
}

function renderizarTabela(lista) {
  if (!lista.length) {
    el.tbodyAlunos.innerHTML = '';
    el.emptyState.style.display = 'block';
    return;
  }

  el.emptyState.style.display = 'none';

  el.tbodyAlunos.innerHTML = lista.map((aluno) => `
    <tr>
      <td>
        <div class="celula-aluno">
          ${
            aluno.foto
              ? `<img src="${aluno.foto}" alt="Foto de ${aluno.nome}" class="foto-aluno">`
              : `<div class="foto-placeholder">SEM FOTO</div>`
          }
        </div>
      </td>
      <td><span class="nome-aluno">${aluno.nome || '-'}</span></td>
      <td>
        <span class="linha-texto">${aluno.responsavel1 || '-'}</span>
        ${aluno.responsavel2 ? `<span class="linha-texto">${aluno.responsavel2}</span>` : ''}
      </td>
      <td>
        <span class="linha-texto">${aluno.telefone1 || '-'}</span>
        ${aluno.telefone2 ? `<span class="linha-texto">${aluno.telefone2}</span>` : ''}
      </td>
      <td>${aluno.embarque || '-'}</td>
      <td>${aluno.desembarque || '-'}</td>
      <td>
        <div class="actions">
          <button class="icon-btn edit" data-id="${aluno.id}" data-action="editar" aria-label="Editar aluno">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
            </svg>
          </button>

          <button class="icon-btn delete" data-id="${aluno.id}" data-action="excluir" aria-label="Excluir aluno">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14H6L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
              <path d="M9 6V4h6v2"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.addEventListener('DOMContentLoaded', async () => {
  initMenu();

  el = obterElementos();
  if (!el || !el.formAluno) return;

  alunos = await carregarAlunos();

  configurarModal();
  configurarBusca();
  configurarMascaras();
  configurarPreviewFoto();
  configurarFormulario();
  configurarTabela();

  renderizar();
});