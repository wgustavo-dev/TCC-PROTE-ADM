# Leia-me antes de mecher no projeto - by: Wagner
por favor NUNCA COMITE O .ENV!!!
**Pacotes que estamos usando (NPM):**
express, cors, dotenv, mysql2, typeorm, reflect-metadata, typescript, ts-node-dev, @types/node, @types/express, @types/cors

---

prompt de contexto atual do projeto:
Contexto atual do projeto PROTE ADM:

Estamos desenvolvendo um sistema administrativo de gerenciamento de transporte escolar chamado PROTE ADM, voltado para um único condutor (cliente único do sistema). O projeto é dividido em duas partes:

* Landing page institucional (já finalizada em outro repositório)
* Área administrativa (repositório atual), contendo frontend e backend integrados

Tecnologias utilizadas:

Backend:

* Node.js
* TypeScript
* Express
* TypeORM
* MySQL
* Multer para upload de arquivos/imagens

Frontend:

* HTML
* CSS
* JavaScript puro (sem framework)

Arquitetura do backend:

* padrão MVC
* separação em:

  * models/entities
  * services
  * controllers
  * routes

Banco de dados atual:

As tabelas principais do sistema são:

* monitor
* condutor
* responsavel
* aluno
* orcamento
* presenca
* mensalidade
* despesa
* documento

Relacionamentos principais:

* aluno pertence a responsavel e condutor
* presenca pertence a aluno
* mensalidade pertence a aluno
* documento pertence a condutor
* orcamento pertence ao condutor
* condutor pode possuir monitor
* despesa atualmente não possui chave estrangeira

Regras importantes do projeto:

* o sistema possui apenas 1 condutor
* evitar retorno de dados redundantes nas APIs
* frontend consome backend via fetch
* frontend servido pelo próprio Express
* foco em organização simples, funcional e escalável para TCC

Funcionalidades já implementadas:

Infraestrutura:

* configuração completa do ambiente backend
* conexão com MySQL funcionando
* DataSource TypeORM configurado
* Express estruturado
* middleware configurados
* frontend sendo servido pelo backend

Models/Entidades:

* todas as entidades TypeORM criadas e funcionando
* relacionamentos mapeados corretamente
* enums configurados
* upload de imagem de aluno funcionando

Módulo de alunos:

* CRUD completo funcional
* cadastro
* listagem
* edição
* exclusão
* upload de foto
* integração frontend/backend funcionando via fetch

Módulo de presença:

* backend implementado
* presença vinculada ao aluno
* integração com frontend funcionando

Módulo de mensalidade:

* backend implementado
* cálculo automático de atraso
* listagem funcional
* integração frontend/backend funcionando

Dashboard:

* rotas agregadas implementadas
* contagem de alunos
* mensalidades atrasadas
* totais financeiros
* estatísticas gerais do sistema

Problemas já resolvidos:

* body undefined
* erros de chave estrangeira
* problemas de fetch
* problemas de upload
* inconsistências entre frontend e backend
* listagem de alunos
* integração entre páginas
* regras automáticas de mensalidade atrasada

Estado atual do sistema:

* backend estruturado e funcional
* frontend integrado com backend
* CRUDs principais funcionando
* APIs testadas
* sistema parcialmente integrado
* projeto já operando como base real do TCC

Problema importante identificado atualmente:

O fluxo de orçamento precisa ser refatorado.

Hoje a tabela/model `orcamento` possui apenas:

* nome_cliente

Porém isso gera inconsistência, porque:

* o nome do responsável e do aluno ficam misturados
* ao aprovar orçamento:

  * o Responsavel é criado usando `nome_cliente`
  * o Aluno é criado com nome placeholder (“XXXXX”)

Correção planejada:

* separar:

  * nome_responsavel
  * nome_aluno
* atualizar:

  * banco de dados
  * entity/model
  * frontend do orçamento
  * service de aprovação
  * payloads
  * formulários
  * integração frontend/backend

Nova regra do fluxo de aprovação de orçamento:

* ao aprovar orçamento:

  * exibir popup/modal com resumo do orçamento
  * exigir preenchimento obrigatório do valor da mensalidade
  * criar automaticamente:

    * responsável
    * aluno
    * mensalidade inicial

Próximo grande passo do projeto:

* implementar sistema de renovação mensal automática das mensalidades

Regra definida:

* quando virar o mês:

  * novas mensalidades devem ser geradas
  * mensalidades antigas NÃO podem ser apagadas
  * histórico financeiro deve ser preservado
  * frontend deve permitir visualização de mensalidades passadas e atuais

Objetivo final do projeto:
Criar um sistema administrativo completo de transporte escolar para TCC, com:

* controle de alunos
* responsáveis
* presença
* mensalidades
* orçamento
* despesas
* documentos
* dashboard administrativo
* persistência de histórico
* integração total frontend/backend
* arquitetura organizada e escalável para apresentação acadêmica e uso real.
