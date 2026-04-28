-- =========================
-- CRIAÇÃO DO BANCO
-- =========================
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
    FOREIGN KEY (id_monitor) REFERENCES monitor(id_monitor)
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
    id_responsavel INT,
    id_condutor INT,

    FOREIGN KEY (id_responsavel) REFERENCES responsavel(id_responsavel),
    FOREIGN KEY (id_condutor) REFERENCES condutor(id_condutor)
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
    status ENUM('PENDENTE','APROVADO','RECUSADO') DEFAULT 'PENDENTE',
    convertido BOOLEAN DEFAULT FALSE,
    data_solicitacao DATE,
    data_conversao DATE,
    id_condutor INT,

    FOREIGN KEY (id_condutor) REFERENCES condutor(id_condutor)
);

-- =========================
-- TABELA: PRESENCA
-- =========================
CREATE TABLE presenca (
    id_presenca INT AUTO_INCREMENT PRIMARY KEY,
    id_aluno INT NOT NULL,
    data DATE NOT NULL,
    status ENUM('PRESENTE','AUSENTE') NOT NULL,

    FOREIGN KEY (id_aluno) REFERENCES aluno(id_aluno)
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
    status ENUM('PAGO','PENDENTE','ATRASADO') DEFAULT 'PENDENTE',

    FOREIGN KEY (id_aluno) REFERENCES aluno(id_aluno)
);

-- =========================
-- TABELA: DESPESA
-- =========================
CREATE TABLE despesa (
    id_despesa INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL,
    data DATE NOT NULL
);

-- =========================
-- TABELA: documento
-- =========================
CREATE TABLE documento (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    tipo_documento VARCHAR(100) NOT NULL,
    data_emissao DATE,
    data_validade DATE,
    status ENUM('VALIDO','VENCIDO') DEFAULT 'VALIDO',
    id_condutor INT,

    FOREIGN KEY (id_condutor) REFERENCES condutor(id_condutor)
);

--alterando a tabela alunos porque agora eles tem que ter foto
ALTER TABLE aluno
ADD foto VARCHAR(255);

-- Tstando criação de alunos, cada aluno precisa de um resposavel e um condutor(apaga dps)

INSERT INTO responsavel (nome, telefone, email, endereco, quantidade_alunos)
VALUES ('Maria Silva', '11999999999', 'maria@email.com', 'Rua das Flores, 100', 1);

INSERT INTO condutor (nome, email, telefone, escolas, possui_monitor)
VALUES ('Carlos Souza', 'carlos@email.com', '11988888888', 'Escola Estadual São Paulo', false);

select * from aluno