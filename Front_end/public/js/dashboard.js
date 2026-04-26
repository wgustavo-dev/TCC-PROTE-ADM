/*
   MENU HAMBÚRGUER
   Controla abertura e fechamento da sidebar no celular.
   Classes usadas: .aberta (sidebar), .visivel (fundo),
   .aberto (botão para animação do X).*/
var botaoMenu   = document.getElementById('botaoMenu');
var sidebar     = document.getElementById('sidebar');
var fundoEscuro = document.getElementById('fundoEscuro');

function abrirSidebar() {
  sidebar.classList.add('aberta');
  fundoEscuro.classList.add('visivel');
  botaoMenu.classList.add('aberto');
  botaoMenu.setAttribute('aria-label', 'Fechar menu');
}
/* */
function fecharSidebar() {
  sidebar.classList.remove('aberta');
  fundoEscuro.classList.remove('visivel');
  botaoMenu.classList.remove('aberto');
  botaoMenu.setAttribute('aria-label', 'Abrir menu');
}

botaoMenu.addEventListener('click', function() {
  sidebar.classList.contains('aberta') ? fecharSidebar() : abrirSidebar();
});

fundoEscuro.addEventListener('click', fecharSidebar);

/* Fecha sidebar ao navegar por qualquer item no celular */
document.querySelectorAll('.nav-item').forEach(function(item) {
  item.addEventListener('click', function() {
    if (window.innerWidth <= 700) fecharSidebar();
  });
});


/*
   INICIALIZAÇÃO
   Aguarda o DOM carregar, depois carrega os dados do
   localStorage e atualiza todos os elementos da tela.
*/
window.addEventListener('DOMContentLoaded', function() {
  var dados = carregarDadosDasTelas();

  atualizarIndicadores(dados);
  atualizarResumoFinanceiro(dados);
  atualizarAlertas(dados);
  animarBarraPresenca();
  iniciarMapa();
  iniciarGrafico(dados);
});


/* 
   CARREGAMENTO DE DADOS DAS OUTRAS TELAS
   Lê o localStorage de cada módulo do sistema e retorna
   um objeto consolidado para o dashboard usar.

   COMO EXPANDIR:
   Quando criar a tela de Alunos, Mensalidades ou
   Vistorias, salve os dados com uma chave no localStorage
   e adicione a leitura aqui seguindo o mesmo padrão.
*/
function carregarDadosDasTelas() {
  return {
    despesas:     lerDoStorage('rotaescolar_despesas',     []),
    alunos:       lerDoStorage('rotaescolar_alunos',       []),
    mensalidades: lerDoStorage('rotaescolar_mensalidades', []),
    vistorias:    lerDoStorage('rotaescolar_vistorias',    []),
    presencas:    lerDoStorage('rotaescolar_presencas',    [])
  };
}

/* Lê e faz o parse de uma chave do localStorage com segurança.
   Retorna o valorPadrao se a chave não existir ou der erro. */
function lerDoStorage(chave, valorPadrao) {
  try {
    var salvo = localStorage.getItem(chave);
    return salvo ? JSON.parse(salvo) : valorPadrao;
  } catch (e) {
    console.error('Erro ao ler "' + chave + '" do localStorage:', e);
    return valorPadrao;
  }
}


/* 
   ATUALIZAR INDICADORES (cards de KPI)
   Calcula os valores a partir dos dados das outras telas
   e preenche os elementos com id="kpi...".
*/
function atualizarIndicadores(dados) {
  /* -- Despesas -- */
  var totalDespesas = dados.despesas.reduce(function(acc, d) {
    return acc + (d.valor || 0);
  }, 0);

  document.getElementById('kpiDespesas').textContent = formatarBRL(totalDespesas);
  document.getElementById('detalheDespesas').textContent = dados.despesas.length > 0
    ? dados.despesas.length + ' despesa' + (dados.despesas.length !== 1 ? 's' : '') + ' registrada' + (dados.despesas.length !== 1 ? 's' : '')
    : 'Nenhuma despesa cadastrada';

  /* -- Receita (mensalidades pagas) --
     Quando a tela de Mensalidades estiver pronta, substitua
     o cálculo abaixo pelo total das mensalidades pagas. */
  var totalReceita = dados.mensalidades.reduce(function(acc, m) {
    return acc + (m.valor || 0);
  }, 0);

  document.getElementById('kpiReceita').textContent = formatarBRL(totalReceita);
  document.getElementById('detalheReceita').textContent = dados.mensalidades.length > 0
    ? dados.mensalidades.length + ' mensalidade' + (dados.mensalidades.length !== 1 ? 's' : '') + ' registrada' + (dados.mensalidades.length !== 1 ? 's' : '')
    : 'Nenhuma mensalidade cadastrada';

  /* -- Lucro = Receita - Despesas -- */
  var lucro = totalReceita - totalDespesas;
  document.getElementById('kpiLucro').textContent = formatarBRL(lucro);

  /* -- Alunos ativos --
     Filtra apenas alunos com status 'ativo' quando houver
     esse campo; caso contrário conta todos. */
  var alunosAtivos = dados.alunos.filter(function(a) {
    return !a.status || a.status === 'ativo';
  }).length;

  document.getElementById('kpiAlunos').textContent = alunosAtivos;

  /* -- Presença média --
     Quando a tela de Presença estiver pronta, calcule
     a porcentagem real. Por enquanto exibe 0%. */
  var presencaMedia = 0;
  if (dados.presencas.length > 0) {
    var somaPresenca = dados.presencas.reduce(function(acc, p) {
      return acc + (p.porcentagem || 0);
    }, 0);
    presencaMedia = somaPresenca / dados.presencas.length;
  }

  document.getElementById('kpiPresenca').textContent = formatarPorcentagem(presencaMedia);
  document.getElementById('barraPresenca').style.width = presencaMedia + '%';
}


/* 
   BARRA DE PRESENÇA
   Começa em 0% e anima até o valor definido pelo JS.
   O delay de 200ms garante que a transição CSS seja visível.
*/
function animarBarraPresenca() {
  var barra = document.getElementById('barraPresenca');
  if (!barra) return;
  var larguraFinal = barra.style.width;
  barra.style.width = '0%';
  setTimeout(function() {
    barra.style.width = larguraFinal;
  }, 200);
}


/*
   RESUMO FINANCEIRO
   Preenche os valores de receita, despesas e saldo,
   e ajusta o banner conforme o saldo ser positivo ou não.
*/
function atualizarResumoFinanceiro(dados) {
  var totalDespesas = dados.despesas.reduce(function(acc, d) {
    return acc + (d.valor || 0);
  }, 0);

  var totalReceita = dados.mensalidades.reduce(function(acc, m) {
    return acc + (m.valor || 0);
  }, 0);

  var saldo = totalReceita - totalDespesas;

  document.getElementById('resumoReceita').textContent  = formatarBRL(totalReceita);
  document.getElementById('resumoDespesas').textContent = formatarBRL(totalDespesas);
  document.getElementById('resumoSaldo').textContent    = formatarBRL(saldo);

  /* Banner de status: muda cor e texto conforme o saldo */
  var banner     = document.getElementById('bannerSaldo');
  var tituloBan  = document.getElementById('tituloBanner');
  var descricBan = document.getElementById('descricaoBanner');

  var semMovimentacao = totalReceita === 0 && totalDespesas === 0;

  if (semMovimentacao) {
    banner.classList.remove('negativo');
    tituloBan.textContent  = 'Sem movimentações ainda.';
    descricBan.textContent = 'Cadastre despesas e mensalidades para ver seu resumo aqui.';
  } else if (saldo >= 0) {
    banner.classList.remove('negativo');
    tituloBan.textContent  = '✓ Operação saudável este mês!';
    descricBan.textContent = 'Continue monitorando suas despesas para manter a lucratividade.';
  } else {
    banner.classList.add('negativo');
    tituloBan.textContent  = '⚠ Atenção: saldo negativo!';
    descricBan.textContent = 'Suas despesas estão superando a receita. Revise os lançamentos.';
  }
}


/*
   ALERTAS E PENDÊNCIAS
   Verifica os dados de cada módulo e gera alertas
   automaticamente conforme as regras de negócio.

   COMO EXPANDIR:
   Adicione novos blocos if() seguindo o mesmo padrão
   quando criar as telas de Vistorias, Mensalidades, etc.
*/
function atualizarAlertas(dados) {
  var lista   = document.getElementById('listaAlertas');
  var alertas = [];

  /* Vistorias vencidas */
  var hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  dados.vistorias.forEach(function(v) {
    if (v.dataVencimento) {
      var venc = new Date(v.dataVencimento);
      if (venc < hoje) {
        var diasAtraso = Math.floor((hoje - venc) / (1000 * 60 * 60 * 24));
        alertas.push({
          tipo:      'amarelo',
          titulo:    'Vistoria Vencida',
          descricao: 'Venceu há ' + diasAtraso + ' dia' + (diasAtraso !== 1 ? 's' : '')
        });
      }
    }
  });

  /* Mensalidades em atraso */
  var mensalidadesAtrasadas = dados.mensalidades.filter(function(m) {
    return m.status === 'atrasada' || m.status === 'vencida';
  });

  if (mensalidadesAtrasadas.length > 0) {
    var totalAtrasado = mensalidadesAtrasadas.reduce(function(acc, m) {
      return acc + (m.valor || 0);
    }, 0);
    alertas.push({
      tipo:      'vermelho',
      titulo:    mensalidadesAtrasadas.length + ' Mensalidade' + (mensalidadesAtrasadas.length !== 1 ? 's' : '') + ' Atrasada' + (mensalidadesAtrasadas.length !== 1 ? 's' : ''),
      descricao: 'Total de ' + formatarBRL(totalAtrasado) + ' em atraso'
    });
  }

  /* Despesas do mês atual (informativo) */
  var mesAtual = hoje.getMonth();
  var anoAtual = hoje.getFullYear();
  var despesasMes = dados.despesas.filter(function(d) {
    if (!d.data) return false;
    var dt = new Date(d.data);
    return dt.getMonth() === mesAtual && dt.getFullYear() === anoAtual;
  });

  if (despesasMes.length > 0) {
    var totalMes = despesasMes.reduce(function(acc, d) { return acc + (d.valor || 0); }, 0);
    alertas.push({
      tipo:      'azul',
      titulo:    despesasMes.length + ' Despesa' + (despesasMes.length !== 1 ? 's' : '') + ' este mês',
      descricao: 'Total de ' + formatarBRL(totalMes) + ' lançado'
    });
  }

  /* Renderiza os alertas ou exibe aviso de "nenhum alerta" */
  if (alertas.length === 0) {
    lista.innerHTML = '<p class="aviso-sem-dados">Nenhum alerta no momento.</p>';
    return;
  }

  lista.innerHTML = alertas.map(function(a) {
    return (
      '<div class="alerta alerta-' + a.tipo + '">' +
        '<p class="titulo-alerta ' + a.tipo + '">' + escaparHTML(a.titulo) + '</p>' +
        '<p class="descricao-alerta ' + a.tipo + '">' + escaparHTML(a.descricao) + '</p>' +
      '</div>'
    );
  }).join('');
}


/*
   MAPA DE ROTAS — Leaflet + OpenStreetMap
   Por enquanto mostra só o mapa base centralizado.
   Quando a tela de Rotas estiver pronta, passe as
   coordenadas das rotas reais para iniciarMapa().
*/
function iniciarMapa() {
  if (typeof L === 'undefined') {
    console.warn('Leaflet não carregou. Verifique sua conexão com a internet.');
    return;
  }

  /* Centraliza no Brasil até as rotas reais serem cadastradas */
  var mapa = L.map('mapa-rotas', {
    zoomControl: true,
    scrollWheelZoom: false
  }).setView([-23.5489, -46.6388], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(mapa);

  /* Aviso no mapa até as rotas serem cadastradas */
  var avisoRotas = L.control({ position: 'topright' });
  avisoRotas.onAdd = function() {
    var div = L.DomUtil.create('div');
    div.style.cssText = 'background:#fff;padding:8px 10px;border-radius:8px;font-size:12px;border:1px solid #e5e7eb;color:#6b7280;max-width:160px;line-height:1.5';
    div.innerHTML = 'Nenhuma rota cadastrada ainda.';
    return div;
  };
  avisoRotas.addTo(mapa);

}


/* 
   GRÁFICO RECEITA × DESPESA — Chart.js
   Agrupa os dados de mensalidades e despesas por mês
   para montar o gráfico de linha anual.
*/
function iniciarGrafico(dados) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js não carregou. Verifique sua conexão com a internet.');
    return;
  }

  var canvas = document.getElementById('graficoFinanceiro');
  if (!canvas) return;

  var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  /* Inicializa os 12 meses com zero */
  var receita = new Array(12).fill(0);
  var despesa = new Array(12).fill(0);

  /* Soma despesas por mês */
  dados.despesas.forEach(function(d) {
    if (d.data) {
      var mes = new Date(d.data).getMonth(); /* 0 = Jan, 11 = Dez */
      despesa[mes] += d.valor || 0;
    }
  });

  /* Soma mensalidades (receita) por mês
     Adapte conforme o campo de data da tela de Mensalidades */
  dados.mensalidades.forEach(function(m) {
    if (m.data) {
      var mes = new Date(m.data).getMonth();
      receita[mes] += m.valor || 0;
    }
  });

  new Chart(canvas, {
    type: 'line',
    data: {
      labels: meses,
      datasets: [
        {
          label: 'Receita',
          data: receita,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.08)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Despesa',
          data: despesa,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.06)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 12, boxHeight: 2, font: { size: 12 }, color: '#6b7280' }
        },
        tooltip: {
          callbacks: {
            label: function(contexto) {
              return ' ' + contexto.dataset.label + ': ' +
                formatarBRL(contexto.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#9ca3af' }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { size: 11 },
            color: '#9ca3af',
            callback: function(valor) {
              return 'R$' + (valor / 1000).toFixed(0) + 'k';
            }
          }
        }
      }
    }
  });
}


/* 
   UTILITÁRIOS
*/

/* Formata número para moeda BRL: 8400 → "R$ 8.400,00" */
function formatarBRL(valor) {
  return (valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

/* Formata decimal para porcentagem: 92.5 → "92,5%" */
function formatarPorcentagem(valor) {
  return (valor || 0).toFixed(1) + '%';
}

/* Escapa HTML para evitar XSS ao inserir texto no innerHTML */
function escaparHTML(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}