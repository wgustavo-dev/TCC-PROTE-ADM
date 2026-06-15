-- =====================================================
-- SCHEMA PROTE ADM - VERSÃO AJUSTADA PARA MEGA-MANUTENÇÃO
-- =====================================================
-- ALTERAÇÕES REALIZADAS NESTA VERSÃO:
--
-- 1) TABELA orcamento:
--    - Campo nome_cliente foi substituído por nome_responsavel.
--    - Motivo: orçamento não guarda dados do aluno, apenas dados do responsável.
--
-- 2) TABELA orcamento:
--    - Enum de status foi alterado de:
--      ('PENDENTE','APROVADO','RECUSADO')
--      para:
--      ('PENDENTE','EM_CADASTRO','CONVERTIDO','RECUSADO')
--    - Motivo: o orçamento só deve virar CONVERTIDO depois que responsável,
--      aluno(s) e mensalidade(s) forem cadastrados.
--
-- 3) TABELA responsavel:
--    - Campo email permanece opcional.
--    - Campo endereco foi definido como obrigatório.
--    - Campo quantidade_alunos foi definido como obrigatório.
--    - Motivo: no fluxo manual, responsável precisa informar quantos alunos serão cadastrados.
--
-- 4) TABELA orcamento:
--    - Campo quantidade_alunos foi definido como obrigatório com DEFAULT 1.
--    - Motivo: o fluxo de conversão depende desse campo para repetir aluno -> mensalidade.
--
-- 5) INSERTS:
--    - Todos os usos de nome_cliente foram trocados por nome_responsavel.
--    - Status APROVADO foi substituído por CONVERTIDO quando o orçamento já estiver convertido.
--
-- OBSERVAÇÃO IMPORTANTE:
-- Este schema recria o banco do zero usando DROP DATABASE.
-- Use apenas em ambiente local/teste ou depois de backup.
-- =====================================================


-- =========================
-- CRIAÇÃO DO BANCO
-- =========================
DROP DATABASE IF EXISTS schema_prote;

CREATE DATABASE schema_prote;
USE schema_prote;

-- =========================
-- TABELA: MONITOR
-- =========================
CREATE TABLE monitor (
    id_monitor INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    senha VARCHAR(255),
    telefone VARCHAR(20),
    foto VARCHAR(255),
    token_recuperacao VARCHAR(255),
    expiracao_recuperacao DATETIME
);

-- =========================
-- TABELA: RESPONSAVEL
-- =========================
CREATE TABLE responsavel (
    id_responsavel INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,

    -- ALTERADO/MANTIDO: email é opcional no banco.
    -- Antes: já estava sem NOT NULL.
    -- Mantido assim para respeitar a nova regra do sistema.
    email VARCHAR(100),

    -- ALTERADO: endereço agora é obrigatório.
    -- Antes: endereco VARCHAR(255)
    -- Agora: endereco VARCHAR(255) NOT NULL
    endereco VARCHAR(255) NOT NULL,

    -- ALTERADO: quantidade_alunos agora é obrigatória.
    -- Antes: quantidade_alunos INT
    -- Agora: quantidade_alunos INT NOT NULL DEFAULT 1
    -- Motivo: no cadastro manual, o fluxo precisa saber quantos alunos cadastrar.
    quantidade_alunos INT NOT NULL DEFAULT 1,

    -- ALTERADO: validação mínima para impedir quantidade inválida.
    -- Observação: CHECK funciona em versões recentes do MySQL.
    CONSTRAINT chk_responsavel_quantidade_alunos
    CHECK (quantidade_alunos >= 1)
);

-- =========================
-- TABELA: CONDUTOR
-- =========================
CREATE TABLE condutor (
    id_condutor INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    senha VARCHAR(255),
    telefone VARCHAR(20),
    escolas TEXT,
    possui_monitor BOOLEAN DEFAULT FALSE,
    foto VARCHAR(255),
    token_recuperacao VARCHAR(255),
    expiracao_recuperacao DATETIME,
    id_monitor INT,

    FOREIGN KEY (id_monitor)
    REFERENCES monitor(id_monitor)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

-- =========================
-- TABELA: ALUNO
-- =========================
CREATE TABLE aluno (
    id_aluno INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    bairro VARCHAR(100),
    escola VARCHAR(150),
    turno ENUM('MANHA','TARDE','NOITE'),
    endereco_embarque VARCHAR(255),
    endereco_desembarque VARCHAR(255),
    tipo_trajeto ENUM('IDA','VOLTA','AMBOS'),
    foto VARCHAR(255),

    id_responsavel INT,
    id_condutor INT,

    FOREIGN KEY (id_responsavel)
    REFERENCES responsavel(id_responsavel)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    FOREIGN KEY (id_condutor)
    REFERENCES condutor(id_condutor)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- =========================
-- TABELA: ORCAMENTO
-- =========================
CREATE TABLE orcamento (
    id_orcamento INT AUTO_INCREMENT PRIMARY KEY,

    -- ALTERADO: nome_cliente foi substituído por nome_responsavel.
    -- Antes: nome_cliente VARCHAR(100) NOT NULL
    -- Agora: nome_responsavel VARCHAR(100) NOT NULL
    -- Motivo: orçamento guarda dados do responsável, não do aluno.
    nome_responsavel VARCHAR(100) NOT NULL,

    telefone VARCHAR(20) NOT NULL,

    bairro VARCHAR(100),
    escola VARCHAR(150),

    turno ENUM('MANHA','TARDE','NOITE'),

    -- ALTERADO: quantidade_alunos agora é obrigatória.
    -- Antes: quantidade_alunos INT
    -- Agora: quantidade_alunos INT NOT NULL DEFAULT 1
    -- Motivo: o fluxo orçamento -> responsável -> aluno -> mensalidade depende desse número.
    quantidade_alunos INT NOT NULL DEFAULT 1,

    tipo_trajeto ENUM('IDA','VOLTA','AMBOS'),

    endereco_embarque VARCHAR(255),
    endereco_desembarque VARCHAR(255),

    -- MANTIDO: valor continua no orçamento por enquanto.
    -- Observação: a mensalidade não usará esse valor automaticamente nesta manutenção.
    valor DECIMAL(10,2),

    -- ALTERADO: status recebeu estados reais do novo fluxo.
    -- Antes: ENUM('PENDENTE','APROVADO','RECUSADO')
    -- Agora: ENUM('PENDENTE','EM_CADASTRO','CONVERTIDO','RECUSADO')
    --
    -- PENDENTE: orçamento ainda não iniciado.
    -- EM_CADASTRO: orçamento iniciou conversão, mas ainda não terminou responsável/aluno/mensalidade.
    -- CONVERTIDO: fluxo finalizado com sucesso.
    -- RECUSADO: orçamento recusado.
    status ENUM('PENDENTE','EM_CADASTRO','CONVERTIDO','RECUSADO')
    DEFAULT 'PENDENTE',

    -- MANTIDO: convertido continua existindo para filtro rápido.
    -- Deve ser TRUE somente quando status = 'CONVERTIDO'.
    convertido BOOLEAN DEFAULT FALSE,

    data_solicitacao DATE,
    data_conversao DATE,

    id_condutor INT,

    FOREIGN KEY (id_condutor)
    REFERENCES condutor(id_condutor)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    -- ALTERADO: validação mínima para impedir quantidade inválida.
    CONSTRAINT chk_orcamento_quantidade_alunos
    CHECK (quantidade_alunos >= 1)
);

-- =========================
-- TABELA: PRESENCA
-- =========================
CREATE TABLE presenca (
    id_presenca INT AUTO_INCREMENT PRIMARY KEY,

    id_aluno INT NOT NULL,

    data DATE NOT NULL,

    status ENUM('PRESENTE','AUSENTE') NOT NULL,

    FOREIGN KEY (id_aluno)
    REFERENCES aluno(id_aluno)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- =========================
-- TABELA: MENSALIDADE
-- =========================
CREATE TABLE mensalidade (
    id_mensalidade INT AUTO_INCREMENT PRIMARY KEY,

    id_aluno INT NOT NULL,

    valor DECIMAL(10,2) NOT NULL,

    data_vencimento DATE NOT NULL,

    data_pagamento DATE,

    status ENUM('PAGO','PENDENTE','ATRASADO')
    DEFAULT 'PENDENTE',

    id_condutor INT,

    FOREIGN KEY (id_aluno)
    REFERENCES aluno(id_aluno)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    FOREIGN KEY (id_condutor)
    REFERENCES condutor(id_condutor)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- =========================
-- TABELA: DESPESA
-- =========================
CREATE TABLE despesa (
    id_despesa INT AUTO_INCREMENT PRIMARY KEY,

    tipo VARCHAR(100) NOT NULL,

    descricao TEXT,

    valor DECIMAL(10,2) NOT NULL,

    data DATE NOT NULL,

    id_condutor INT,

    FOREIGN KEY (id_condutor)
    REFERENCES condutor(id_condutor)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- =========================
-- TABELA: DOCUMENTO
-- =========================
CREATE TABLE documento (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,

    tipo_documento VARCHAR(100) NOT NULL,

    data_emissao DATE,

    data_validade DATE,

    status ENUM('VALIDO','VENCIDO')
    DEFAULT 'VALIDO',

    id_condutor INT,

    FOREIGN KEY (id_condutor)
    REFERENCES condutor(id_condutor)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- =====================================================
-- INSERTS BASE
-- =====================================================

-- =========================
-- MONITOR
-- =========================
INSERT INTO monitor (
    nome,
    email,
    telefone,
    foto
)
VALUES (
    'João Monitor',
    'monitor@email.com',
    '11977777777',
    'monitor.jpg'
);

-- =========================
-- RESPONSAVEL
-- =========================
INSERT INTO responsavel (
    nome,
    telefone,
    email,
    endereco,

    -- ALTERADO: insert agora informa quantidade_alunos,
    -- pois a coluna passou a ser obrigatória.
    quantidade_alunos
)
VALUES (
    'Maria Silva',
    '11999999999',
    'maria@email.com',
    'Rua das Flores, 100',
    1
);

-- =========================
-- CONDUTOR
-- =========================
INSERT INTO condutor (
    nome,
    email,
    senha,
    telefone,
    escolas,
    possui_monitor,
    foto,
    id_monitor
)
VALUES (
    'Carlos Souza',
    'liametechnologies@gmail.com',
    '$2a$10$7fAHxESMFev.n3JnpJDcI.3CqrxRSj9.d/4sxMDDM/9KI7QSnpUGG',
    '11988888888',
    'Escola Estadual São Paulo',
    TRUE,
    'carlos.jpg',
    1
);

-- =========================
-- MONITOR PREDEFINIDO (opcional)
-- O monitor terá acesso apenas a presença, alunos e responsáveis
INSERT INTO monitor (
    nome,
    email,
    senha,
    telefone,
    foto
)
VALUES (
    'Monitor de Teste',
    'monitor@prote.com',
    '$2a$10$bThJp8oEuGYybn67.u4DCO93tlb0Mon64TtEScKBAvA/Hn0j6wLMu',
    '11977712345',
    'monitor.jpg'
);

-- =========================
-- ALUNO
-- =========================
INSERT INTO aluno (
    nome,
    bairro,
    escola,
    turno,
    endereco_embarque,
    endereco_desembarque,
    tipo_trajeto,
    foto,
    id_responsavel,
    id_condutor
)
VALUES (
    'Pedro Silva',
    'Jardim Paulista',
    'Escola Estadual São Paulo',
    'MANHA',
    'Rua das Flores, 100',
    'Escola Estadual São Paulo',
    'AMBOS',
    'pedro.jpg',
    1,
    1
);

-- =========================
-- PRESENCA
-- =========================
INSERT INTO presenca (
    id_aluno,
    data,
    status
)
VALUES (
    1,
    '2025-04-10',
    'PRESENTE'
);

-- =========================
-- MENSALIDADE
-- =========================
INSERT INTO mensalidade (
    id_aluno,
    valor,
    data_vencimento,
    data_pagamento,
    status,
    id_condutor
)
VALUES (
    1,
    580.00,
    '2025-05-10',
    NULL,
    'PENDENTE',
    1
);

-- =========================
-- ORÇAMENTOS
-- =========================
INSERT INTO orcamento (
    -- ALTERADO: nome_cliente foi substituído por nome_responsavel.
    nome_responsavel,
    telefone,
    bairro,
    escola,
    turno,
    quantidade_alunos,
    tipo_trajeto,
    endereco_embarque,
    endereco_desembarque,
    valor,
    status,
    convertido,
    data_solicitacao,
    data_conversao,
    id_condutor
)
VALUES
(
    'Ana Beatriz Costa',
    '11991111111',
    'Jardim Paulista',
    'Escola Estadual São Paulo',
    'MANHA',
    1,
    'AMBOS',
    'Rua das Rosas, 45',
    'Escola Estadual São Paulo',
    580.00,

    -- MANTIDO COMO PENDENTE: ainda não iniciou conversão.
    'PENDENTE',
    FALSE,
    '2025-04-01',
    NULL,
    1
),
(
    'Fernando Lima',
    '11992222222',
    'Vila Mariana',
    'Colégio Objetivo',
    'TARDE',
    1,
    'IDA',
    'Av. Paulista, 200',
    'Colégio Objetivo',
    320.00,

    -- ALTERADO: antes estava APROVADO.
    -- Como APROVADO saiu do enum, orçamento já finalizado deve ser CONVERTIDO.
    'CONVERTIDO',
    TRUE,
    '2025-04-03',
    '2025-04-04',
    1
),
(
    'Juliana Martins',
    '11993333333',
    'Tatuapé',
    'Colégio São José',
    'MANHA',
    2,
    'AMBOS',
    'Rua Itapura, 800',
    'Colégio São José',
    900.00,

    -- ADICIONADO: exemplo de orçamento em cadastro.
    -- Útil para testar a nova etapa intermediária.
    'EM_CADASTRO',
    FALSE,
    '2025-04-05',
    NULL,
    1
);

-- =========================
-- DESPESAS
-- =========================
INSERT INTO despesa (
    tipo,
    descricao,
    valor,
    data,
    id_condutor
)
VALUES
(
    'Combustível',
    'Abastecimento completo — posto Shell Tatuapé',
    350.00,
    '2025-04-02',
    1
),
(
    'Manutenção Mecânica',
    'Troca de óleo e filtro',
    220.00,
    '2025-03-18',
    1
);

-- =========================
-- DOCUMENTOS
-- =========================
INSERT INTO documento (
    tipo_documento,
    data_emissao,
    data_validade,
    status,
    id_condutor
)
VALUES
(
    'CNH',
    '2021-06-15',
    '2031-06-15',
    'VALIDO',
    1
),
(
    'CRLV Perua',
    '2024-04-20',
    '2025-04-28',
    'VALIDO',
    1
),
(
    'Vistoria Inspeção DETRAN',
    '2024-08-10',
    '2025-02-10',
    'VENCIDO',
    1
);

ALTER TABLE aluno MODIFY id_responsavel INT NOT NULL;

-- =========================
-- TESTES
-- =========================
SELECT * FROM monitor;
SELECT * FROM responsavel;
SELECT * FROM condutor;
SELECT * FROM aluno;
SELECT * FROM presenca;
SELECT * FROM mensalidade;
SELECT * FROM orcamento;
SELECT * FROM despesa;
SELECT * FROM documento;
