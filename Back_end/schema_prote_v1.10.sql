-- =====================================================
-- SCHEMA PROTE ADM - v1.10
-- =====================================================
-- ALTERAÇÕES NESTA VERSÃO EM RELAÇÃO À v1.9:
--
-- 1.0) Campos Enum de turno, removido a opção NOITE
--
-- 1) NOVA TABELA: ITINERARIO_ALUNO (módulo Itinerários)
--    - Guarda a ORDEM manual (arrastada pelo monitor/condutor
--      na tela de Alunos), separada do cadastro em si.
--    - Um aluno com tipo_trajeto = 'AMBOS' gera DUAS linhas aqui
--      (uma 'IDA', uma 'VOLTA') — cada uma arrastável e ordenável
--      de forma independente dentro do turno.
--    - FK para aluno(id_aluno) com ON DELETE CASCADE: excluiu o
--      aluno, some do itinerário automaticamente.
--    - ordem é sempre numerada por turno + condutor, então a fila
--      de um condutor nunca interfere na de outro.
--
-- (changelog da v1.8 mantido abaixo para referência)
-- 2) RELACIONAMENTO CONDUTOR <-> MONITOR INVERTIDO
--    - Antes: condutor.id_monitor -> monitor (1 condutor apontava
--      para 1 monitor). Isso não representava a regra de negócio real
--      (um condutor pode ter VÁRIOS monitores).
--    - Agora: monitor.id_condutor -> condutor (N monitores para 1
--      condutor). Todo monitor pertence obrigatoriamente a um condutor.
--    - Os campos condutor.id_monitor e condutor.possui_monitor foram
--      REMOVIDOS, pois deixaram de fazer sentido com a FK invertida.
--
-- 3) EXCLUSÃO LÓGICA (novo módulo Controle de Acessos)
--    - Adicionada a coluna "ativo BOOLEAN NOT NULL DEFAULT TRUE" nas
--      tabelas condutor e monitor.
--    - O DELETE do módulo de Acessos não remove a linha do banco,
--      apenas define ativo = FALSE. Isso preserva o histórico
--      (mensalidades, despesas, documentos, alunos vinculados, etc.)
--      e mantém a integridade dos relacionamentos existentes.
--    - Usuários com ativo = FALSE não conseguem mais efetuar login.
--
-- =====================================================


-- =========================
-- CRIAÇÃO DO BANCO
-- =========================
DROP DATABASE IF EXISTS schema_prote;

CREATE DATABASE schema_prote;
USE schema_prote;

-- =========================
-- TABELA: CONDUTOR
-- =========================
-- Criada antes de "monitor" porque agora é o monitor que referencia
-- o condutor (e não o contrário, como era na v1.7).
CREATE TABLE condutor (
    id_condutor INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    senha VARCHAR(255),
    telefone VARCHAR(20),
    escolas TEXT,
    foto VARCHAR(255),
    token_recuperacao VARCHAR(255),
    expiracao_recuperacao DATETIME,

    -- exclusão lógica
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

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
    expiracao_recuperacao DATETIME,

    -- todo monitor pertence obrigatoriamente a um condutor.
    -- Preenchido automaticamente pelo backend a partir do condutor
    -- autenticado (req.user), nunca escolhido pelo frontend.
    id_condutor INT NOT NULL,

    -- exclusão lógica
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    FOREIGN KEY (id_condutor)
    REFERENCES condutor(id_condutor)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- =========================
-- TABELA: RESPONSAVEL
-- =========================
CREATE TABLE responsavel (
    id_responsavel INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    endereco VARCHAR(255) NOT NULL,
    quantidade_alunos INT NOT NULL DEFAULT 1,

    CONSTRAINT chk_responsavel_quantidade_alunos
    CHECK (quantidade_alunos >= 1)
);

-- =========================
-- TABELA: ESCOLA
-- =========================
CREATE TABLE escola (
    id_escola INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    endereco VARCHAR(255)
);

-- =========================
-- TABELA: ALUNO
-- =========================
CREATE TABLE aluno (
    id_aluno INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    bairro VARCHAR(100),
    id_escola INT NOT NULL,
    turno ENUM('MANHA','TARDE'),
    endereco_embarque VARCHAR(255),
    endereco_desembarque VARCHAR(255),
    tipo_trajeto ENUM('IDA','VOLTA','AMBOS'),
    foto VARCHAR(255),

    id_responsavel INT NOT NULL,
    id_condutor INT,

    FOREIGN KEY (id_escola)
    REFERENCES escola(id_escola)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

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
-- TABELA: ITINERARIO_ALUNO   (NOVO — v1.9)
-- =========================
-- Fica logo depois de "aluno" porque depende dela (e de condutor).
-- Não mexe em nada da tabela aluno: turno e tipo_trajeto já
-- existiam lá e continuam sendo a fonte da verdade do cadastro.
CREATE TABLE itinerario_aluno (
    id_itinerario INT AUTO_INCREMENT PRIMARY KEY,
    id_aluno      INT NOT NULL,
    id_condutor   INT NOT NULL,
    turno         ENUM('MANHA','TARDE','NOITE') NOT NULL,
    tipo          ENUM('IDA','VOLTA') NOT NULL,
    ordem         INT NOT NULL,
    criado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_aluno)
    REFERENCES aluno(id_aluno)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    FOREIGN KEY (id_condutor)
    REFERENCES condutor(id_condutor)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    -- impede o mesmo aluno aparecer duas vezes com o mesmo tipo no mesmo turno
    UNIQUE KEY uk_aluno_turno_tipo (id_aluno, turno, tipo)
);

-- =========================
-- TABELA: ORCAMENTO
-- =========================
CREATE TABLE orcamento (
    id_orcamento INT AUTO_INCREMENT PRIMARY KEY,
    nome_responsavel VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    bairro VARCHAR(100),
    escola VARCHAR(150),
    turno ENUM('MANHA','TARDE'),
    quantidade_alunos INT NOT NULL DEFAULT 1,
    tipo_trajeto ENUM('IDA','VOLTA','AMBOS'),
    endereco_embarque VARCHAR(255),
    endereco_desembarque VARCHAR(255),
    valor DECIMAL(10,2),
    status ENUM('PENDENTE','EM_CADASTRO','CONVERTIDO','RECUSADO')
    DEFAULT 'PENDENTE',
    convertido BOOLEAN DEFAULT FALSE,
    data_solicitacao DATE,
    data_conversao DATE,

    id_condutor INT,

    FOREIGN KEY (id_condutor)
    REFERENCES condutor(id_condutor)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

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

-- Condutor precisa existir ANTES do monitor, pois agora é o monitor
-- que carrega a FK id_condutor.
INSERT INTO condutor (nome, email, senha, telefone, escolas, foto)
VALUES (
    'Carlos Souza',
    'liametechnologies@gmail.com',
    '$2a$10$7fAHxESMFev.n3JnpJDcI.3CqrxRSj9.d/4sxMDDM/9KI7QSnpUGG',    '11988888888',
    'Escola Estadual São Paulo',
    'carlos.jpg'
);

INSERT INTO monitor (nome, email, telefone, foto, id_condutor)
VALUES ('João Monitor', 'monitor@email.com', '11977777777', 'monitor.jpg', 1);

INSERT INTO monitor (nome, email, senha, telefone, foto, id_condutor)
VALUES (
    'Monitor de Teste',
    'monitor@prote.com',
    '$2a$10$bThJp8oEuGYybn67.u4DCO93tlb0Mon64TtEScKBAvA/Hn0j6wLMu',
    '11977712345',
    'monitor.jpg',
    1
);

INSERT INTO responsavel (nome, telefone, email, endereco, quantidade_alunos)
VALUES ('Maria Silva', '11999999999', 'maria@email.com', 'Rua das Flores, 100', 1);

-- =========================
-- ESCOLA
-- =========================
INSERT INTO escola (nome, endereco)
VALUES ('Escola Estadual São Paulo', 'Rua da Escola, 500');

-- =========================
-- ALUNO
-- =========================
INSERT INTO aluno (
    nome, bairro, id_escola, turno,
    endereco_embarque, endereco_desembarque, tipo_trajeto, foto,
    id_responsavel, id_condutor
)
VALUES (
    'Pedro Silva',
    'Jardim Paulista',
    1,
    'MANHA',
    'Rua das Flores, 100',
    'Escola Estadual São Paulo',
    'AMBOS',
    'pedro.jpg',
    1,
    1
);

-- =========================
-- ITINERARIO_ALUNO   (NOVO — v1.9)
-- =========================
-- Backfill: gera automaticamente as entradas de itinerário pra
-- todo aluno já cadastrado acima. Fica DEPOIS do INSERT de aluno
-- (precisa que os alunos já existam) e ANTES do restante, pra já
-- deixar tudo pronto quando o SELECT de testes rodar lá embaixo.
-- Requer MySQL 8+ ou MariaDB 10.2+ (função ROW_NUMBER).

-- 1) Entradas de IDA (tipo_trajeto IDA ou AMBOS)
INSERT INTO itinerario_aluno (id_aluno, id_condutor, turno, tipo, ordem)
SELECT
    a.id_aluno,
    a.id_condutor,
    a.turno,
    'IDA',
    ROW_NUMBER() OVER (PARTITION BY a.turno, a.id_condutor ORDER BY a.id_aluno)
FROM aluno a
WHERE a.tipo_trajeto IN ('IDA', 'AMBOS')
  AND a.turno IS NOT NULL
  AND a.id_condutor IS NOT NULL;

-- 2) Entradas de VOLTA (tipo_trajeto VOLTA ou AMBOS), continuando a
--    numeração depois das entradas de IDA do mesmo turno/condutor.
INSERT INTO itinerario_aluno (id_aluno, id_condutor, turno, tipo, ordem)
SELECT
    a.id_aluno,
    a.id_condutor,
    a.turno,
    'VOLTA',
    (
      SELECT COUNT(*) FROM itinerario_aluno ia
      WHERE ia.turno = a.turno AND ia.id_condutor = a.id_condutor
    )
    + ROW_NUMBER() OVER (PARTITION BY a.turno, a.id_condutor ORDER BY a.id_aluno)
FROM aluno a
WHERE a.tipo_trajeto IN ('VOLTA', 'AMBOS')
  AND a.turno IS NOT NULL
  AND a.id_condutor IS NOT NULL;



INSERT INTO presenca (id_aluno, data, status)
VALUES (1, '2026-04-10', 'PRESENTE');

INSERT INTO mensalidade (id_aluno, valor, data_vencimento, data_pagamento, status, id_condutor)
VALUES (1, 580.00, '2026-05-10', NULL, 'PENDENTE', 1);

INSERT INTO orcamento (
    nome_responsavel, telefone, bairro, escola, turno, quantidade_alunos,
    tipo_trajeto, endereco_embarque, endereco_desembarque, valor,
    status, convertido, data_solicitacao, data_conversao, id_condutor
)
VALUES
('Ana Beatriz Costa', '11991111111', 'Jardim Paulista', 'Escola Estadual São Paulo', 'MANHA', 1,
 'AMBOS', 'Rua das Rosas, 45', 'Escola Estadual São Paulo', 580.00,
 'PENDENTE', FALSE, '2026-04-01', NULL, 1),
('Fernando Lima', '11992222222', 'Vila Mariana', 'Colégio Objetivo', 'TARDE', 1,
 'IDA', 'Av. Paulista, 200', 'Colégio Objetivo', 320.00,
 'CONVERTIDO', TRUE, '2026-04-03', '2026-04-04', 1),
('Juliana Martins', '11993333333', 'Tatuapé', 'Colégio São José', 'MANHA', 2,
 'AMBOS', 'Rua Itapura, 800', 'Colégio São José', 900.00,
 'EM_CADASTRO', FALSE, '2026-04-05', NULL, 1);

INSERT INTO despesa (tipo, descricao, valor, data, id_condutor)
VALUES
('Combustível', 'Abastecimento completo — posto Shell Tatuapé', 350.00, '2026-04-02', 1),
('Manutenção Mecânica', 'Troca de óleo e filtro', 220.00, '2026-03-18', 1);

INSERT INTO documento (tipo_documento, data_emissao, data_validade, status, id_condutor)
VALUES
('CNH', '2021-06-15', '2031-06-15', 'VALIDO', 1),
('CRLV Perua', '2024-04-20', '2025-04-28', 'VALIDO', 1),
('Vistoria Inspeção DETRAN', '2024-08-10', '2025-02-10', 'VENCIDO', 1);

-- =========================
-- TESTES
-- =========================
SELECT * FROM condutor;
SELECT * FROM monitor;
SELECT * FROM responsavel;
SELECT * FROM escola;
SELECT * FROM aluno;
SELECT * FROM itinerario_aluno;
SELECT * FROM presenca;
SELECT * FROM mensalidade;
SELECT * FROM orcamento;
SELECT * FROM despesa;
SELECT * FROM documento;