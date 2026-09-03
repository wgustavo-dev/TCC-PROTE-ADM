Sistema de Notificações Inteligentes — PROTE ADM

1. Visão geral

Foi implementado no sistema PROTE ADM um sistema de notificações inteligentes e individuais, integrado ao painel administrativo.

O objetivo é permitir que o sistema identifique eventos importantes e avise o condutor de forma organizada, sem transformar o Dashboard em uma lista de alertas.

A ideia adotada foi:

Dashboard informa. Notificação chama para uma ação.

As notificações são exibidas pelo ícone de sino no cabeçalho das páginas, por meio de um painel suspenso. Não foi criada uma página HTML exclusiva para notificações.

2. Funcionalidades implementadas

2.1. Central de notificações

Foi criada uma central de notificações acessível pelo ícone de sino.

A central permite:

Visualizar notificações;

Identificar notificações não lidas;

Contar notificações pendentes no ícone do sino;

Marcar uma notificação como lida;

Marcar todas as notificações como lidas;

Visualizar notificações resolvidas;

Filtrar notificações;

Separar notificações por prioridade;

Acessar diretamente o registro relacionado à notificação.

3. Filtros disponíveis

O painel de notificações possui os seguintes filtros:

Todas

Exibe todas as notificações que ainda não foram resolvidas.

Não lidas

Exibe somente notificações que ainda não foram lidas.

Lidas

Exibe notificações que já foram lidas, mas ainda não foram resolvidas.

Críticas

Exibe somente notificações com prioridade:

CRITICA

Resolvidas

Exibe notificações que já tiveram sua situação solucionada.

4. Hierarquia de prioridades

As notificações possuem quatro níveis de prioridade:

CRÍTICA

ALTA

MÉDIA

BAIXA

A prioridade é utilizada para organizar visualmente e logicamente os avisos.

Regras para documentos

Para documentos, foi adotada a seguinte regra:

Situação

Prioridade

Mais de 7 dias para vencer

Sem notificação

Até 7 dias para vencer

MÉDIA

Até 3 dias para vencer

ALTA

Documento vencido

CRÍTICA

A verificação utiliza a data de validade do documento, evitando depender exclusivamente do campo de status armazenado no banco.

5. Estados da notificação

As notificações possuem um ciclo de vida separado:

NÃO LIDA → LIDA → RESOLVIDA

Não lida

A notificação ainda não foi aberta pelo usuário.

Lida

O usuário já visualizou a notificação.

Resolvida

O problema ou situação relacionado à notificação foi solucionado.

É importante destacar que:

Ler uma notificação não significa resolver o problema.

6. Navegação inteligente

Uma das principais alterações foi transformar a notificação em um acesso direto à informação que precisa de atenção.

Ao clicar em:

Ver detalhes →

o sistema:

Identifica o tipo da notificação;

Identifica a entidade relacionada;

Marca a notificação como lida, caso necessário;

Redireciona para a página correspondente;

Localiza o registro específico;

Abre o registro para visualização/edição.

Documentos

Exemplo:

DOCUMENTO_VENCIDO

O sistema direciona para:

documentos.html?notificacao_documento=ID

Ao carregar a página, o JavaScript identifica o ID e abre automaticamente o documento correspondente.

Mensalidades

Para notificações relacionadas a mensalidades:

mensalidade.html?notificacao_mensalidade=ID

A página localiza a mensalidade e abre o modal correspondente.

Orçamentos

Para novos orçamentos:

orcamento.html?notificacao_orcamento=ID

A página localiza o orçamento e abre sua edição.

7. Parâmetros de navegação

Foram definidos parâmetros específicos para evitar ambiguidades:

notificacao_documento
notificacao_mensalidade
notificacao_orcamento

Após a abertura do registro, o parâmetro é removido da URL utilizando:

window.history.replaceState()

Dessa forma, atualizar a página não faz o sistema abrir novamente o mesmo modal.

8. Arquivos do Front-end alterados

public/js/notificacoes.js

Responsável pela lógica da central de notificações.

Principais funções:

Carregar notificações da API;

Atualizar o contador do sino;

Renderizar notificações;

Aplicar filtros;

Marcar notificações como lidas;

Marcar todas como lidas;

Navegar para o registro relacionado;

Atualizar o estado visual da notificação.

Também foram corrigidos os seletores utilizados para corresponder aos IDs existentes no HTML:

textoNotificacoes
marcarTodasLidas

public/js/documentos.js

Foi adicionada a integração com notificações de documentos.

O arquivo agora:

Lê o parâmetro notificacao_documento;

Localiza o documento pelo ID;

Abre automaticamente o modal de edição;

Remove o parâmetro da URL após o processamento.

public/js/mensalidade.js

Foi adicionada a integração com notificações de mensalidades.

O arquivo agora:

Lê o parâmetro notificacao_mensalidade;

Localiza a mensalidade correspondente;

Abre automaticamente o modal de edição;

Remove o parâmetro da URL após o processamento.

public/js/orcamento.js

Foi adicionada a integração com notificações de orçamentos.

O arquivo agora:

Lê o parâmetro notificacao_orcamento;

Localiza o orçamento correspondente;

Aciona a edição do registro;

Remove o parâmetro da URL após o processamento.

9. Interface

A central foi integrada ao cabeçalho existente.

Não foi criada uma nova página como:

notificacoes.html

Isso mantém a funcionalidade centralizada e evita aumentar desnecessariamente a quantidade de páginas do sistema.

A interface utiliza:

Ícone de sino;

Contador de não lidas;

Painel suspenso;

Filtros;

Indicadores de prioridade;

Estado visual para notificações lidas e resolvidas;

Ação de acesso aos detalhes.

10. Fluxo completo

O funcionamento esperado é:

EVENTO NO SISTEMA
        ↓
REGRA DE NOTIFICAÇÃO
        ↓
IDENTIFICAÇÃO DA ENTIDADE
        ↓
CRIAÇÃO/ATUALIZAÇÃO DA NOTIFICAÇÃO
        ↓
BANCO DE DADOS
        ↓
API /api/notificacoes
        ↓
CENTRAL DE NOTIFICAÇÕES
        ↓
USUÁRIO CLICA EM "VER DETALHES"
        ↓
NOTIFICAÇÃO É MARCADA COMO LIDA
        ↓
SISTEMA IDENTIFICA O REGISTRO
        ↓
PÁGINA CORRESPONDENTE
        ↓
MODAL DO REGISTRO

11. Prevenção de notificações duplicadas

O sistema possui controle para evitar que a mesma ocorrência seja criada repetidamente.

A identificação utiliza informações como:

id_condutor
tipo
entidade_tipo
entidade_id

Isso é importante porque a rotina automática é executada periodicamente.

Sem esse controle, uma mesma situação poderia gerar dezenas ou centenas de notificações iguais.

12. Integração com o Back-end

A central do Front-end utiliza a API:

GET    /api/notificacoes
GET    /api/notificacoes/nao-lidas
GET    /api/notificacoes/:id
PATCH  /api/notificacoes/:id/lida
PATCH  /api/notificacoes/:id/resolver
PATCH  /api/notificacoes/marcar-todas-lidas
DELETE /api/notificacoes/:id

As rotas são protegidas pelo middleware de autenticação.

O usuário autenticado é utilizado para identificar o id_condutor.

13. Tipos de notificações

Os tipos previstos no sistema incluem:

DOCUMENTO_PROXIMO_VENCIMENTO
DOCUMENTO_VENCIMENTO
DOCUMENTO_VENCIDO
NOVO_ORCAMENTO
MENSALIDADE_PENDENTE
MENSALIDADE_ATRASADA

Novos tipos podem ser adicionados futuramente, por exemplo:

PRESENCA
ITINERARIO
SISTEMA
INCONSISTENCIA

14. Diferença entre Dashboard e Notificações

A separação entre os dois recursos foi feita de propósito.

Dashboard

Tem função de apresentar uma visão geral:

3 documentos vencidos
5 mensalidades pendentes
2 novos orçamentos

Notificações

Tem função de indicar uma ação específica:

CRÍTICA
CRLV Perua vencido

Ver detalhes →

Assim, o Dashboard apresenta os indicadores gerais, enquanto a central de notificações direciona o usuário para os registros que precisam de atenção.

15. Organização dos arquivos

A implementação utiliza a seguinte estrutura:

Front_end/
└── public/
    ├── documentos.html
    ├── mensalidade.html
    ├── orcamento.html
    │
    ├── css/
    │   └── notificacoes.css
    │
    └── js/
        ├── notificacoes.js
        ├── documentos.js
        ├── mensalidade.js
        └── orcamento.js

16. Testes recomendados

Após instalar as alterações, recomenda-se testar:

Teste 1 — Documento vencido

Criar/possuir um documento vencido;

Executar o sistema;

Abrir o sino;

Verificar a notificação;

Confirmar prioridade CRÍTICA;

Clicar em Ver detalhes;

Confirmar abertura do documento correto.

Teste 2 — Documento próximo do vencimento

Criar um documento com validade inferior a 7 dias.

Resultado esperado:

Prioridade: MÉDIA

Se estiver a até 3 dias:

Prioridade: ALTA

Teste 3 — Leitura

Abrir uma notificação;

Verificar redução do contador;

Confirmar que ela aparece como lida.

Teste 4 — Ler todas

Clicar em:

Ler todas

Resultado esperado:

Todas as notificações não lidas passam para lidas;

O contador é atualizado.

Teste 5 — Duplicação

Executar a rotina automática novamente.

Resultado esperado:

A mesma ocorrência não deve gerar uma nova notificação duplicada.

Teste 6 — Atualização da página

Após abrir uma notificação, pressionar F5.

Resultado esperado:

O registro não deve ser aberto novamente automaticamente.

17. Resultado da implementação

Com essas alterações, o PROTE ADM passa a possuir uma estrutura de notificações integrada ao sistema, permitindo:

Alertas individualizados;

Priorização por gravidade;

Controle de leitura;

Controle de resolução;

Filtros;

Contador de notificações;

Prevenção de duplicidade;

Navegação direta para o registro relacionado;

Integração com documentos, mensalidades e orçamentos;

Execução automática das verificações;

Separação entre informações do Dashboard e ações pendentes.

A implementação foi estruturada para permitir a expansão futura do sistema sem a necessidade de criar uma nova página exclusivamente para notificações.