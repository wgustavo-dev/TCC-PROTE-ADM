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
    telefone VARCHAR(20),
    foto VARCHAR(255)
);

-- =========================
-- TABELA: RESPONSAVEL
-- =========================
CREATE TABLE responsavel (
    id_responsavel INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    endereco VARCHAR(255),
    quantidade_alunos INT
);

-- =========================
-- TABELA: CONDUTOR
-- =========================
CREATE TABLE condutor (
    id_condutor INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefone VARCHAR(20),
    escolas TEXT,
    possui_monitor BOOLEAN DEFAULT FALSE,
    foto VARCHAR(255),
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

    nome_cliente VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,

    bairro VARCHAR(100),
    escola VARCHAR(150),

    turno ENUM('MANHA','TARDE','NOITE'),

    quantidade_alunos INT,

    tipo_trajeto ENUM('IDA','VOLTA','AMBOS'),

    endereco_embarque VARCHAR(255),
    endereco_desembarque VARCHAR(255),

    valor DECIMAL(10,2),

    status ENUM('PENDENTE','APROVADO','RECUSADO')
    DEFAULT 'PENDENTE',

    convertido BOOLEAN DEFAULT FALSE,

    data_solicitacao DATE,
    data_conversao DATE,

    id_condutor INT,

    FOREIGN KEY (id_condutor)
    REFERENCES condutor(id_condutor)
    ON DELETE CASCADE
    ON UPDATE CASCADE
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
    endereco
)
VALUES (
    'Maria Silva',
    '11999999999',
    'maria@email.com',
    'Rua das Flores, 100'
);

-- =========================
-- CONDUTOR
-- =========================
INSERT INTO condutor (
    nome,
    email,
    telefone,
    escolas,
    possui_monitor,
    foto,
    id_monitor
)
VALUES (
    'Carlos Souza',
    'carlos@email.com',
    '11988888888',
    'Escola Estadual São Paulo',
    TRUE,
    'carlos.jpg',
    1
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
    nome_cliente,
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
    'APROVADO',
    TRUE,
    '2025-04-03',
    '2025-04-04',
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