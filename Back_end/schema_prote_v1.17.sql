-- =====================================================
-- SCHEMA PROTE ADM - v1.18
-- =====================================================
-- Estrutura completa + seed fictícia de janeiro a novembro/2026
--
-- Alterações da v1.18:
-- 1) Seed refeita com dados 100% fictícios:
--    10 responsáveis, 10 alunos (1 por responsável).
--    (condutor preservado da versão anterior)
-- 2) Mensalidades de janeiro a novembro/2026 para todos os
--    alunos (10 alunos x 11 meses = 110 registros), com
--    status coerente com a data de referência 12/11/2026:
--    - PAGO com data_pagamento preenchida
--    - ATRASADO (vencido e não pago, data_pagamento NULL)
--    - PENDENTE (vencimento ainda não chegou)
-- 3) Histórico de despesas de janeiro a novembro/2026
--    (combustível, salário do monitor, seguro, IPVA,
--    manutenção, lavagem, telefone, etc.).
-- 4) Estrutura das tabelas inalterada em relação à v1.17.
--
-- Alterações da v1.17:
-- 1) Seed de alunos define tipo_trajeto (IDA, VOLTA ou AMBOS).
-- 2) Mensalidades PAGO têm data_pagamento; ATRASADO permanece NULL.
--
-- Alterações da v1.16:
-- 1) Seed de alunos define o turno de todos os alunos.
--
-- Alterações da v1.15:
-- 1) Adicionado telefone_emergencia opcional para responsáveis.
--
-- Alterações da v1.14:
-- 1) Adicionada tabela de notificações vinculadas ao condutor.
-- 2) Suporte a notificações lidas e resolvidas.
-- 3) Suporte a vínculo da notificação com registros do sistema.
-- 4) Campos de acessibilidade no aluno:
--    necessidade_acessibilidade_temporaria,
--    necessidade_acessibilidade_permanente,
--    observacao_acessibilidade.
-- 5) Campo cnh no condutor obrigatório e único.
-- 6) Presença diferencia IDA e VOLTA pelo campo tipo.
-- 7) Presença aceita observação opcional para ausências.
-- 8) Chave única da presença: aluno, data, turno e tipo.
--
-- v1.12/v1.13:
-- - presenca.turno diferencia MANHA, TARDE e NOITE.
-- - presença única por id_aluno + data + turno.
--
-- Seed incluída:
-- - 1 condutor
-- - 2 escolas
-- - 10 responsáveis e 10 alunos
-- - 110 mensalidades (jan/2026 a nov/2026)
-- - despesas de jan/2026 a nov/2026
-- - presenca, orcamento, documento e notificacao vazias
-- =====================================================


-- =====================================================
-- CRIAÇÃO DO BANCO
-- =====================================================

DROP DATABASE IF EXISTS schema_prote;

CREATE DATABASE schema_prote;

USE schema_prote;


-- =====================================================
-- TABELA: CONDUTOR
-- =====================================================

CREATE TABLE condutor (
    id_condutor INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    senha VARCHAR(255),
    telefone VARCHAR(20),
    cnh VARCHAR(11) NOT NULL UNIQUE,
    escolas TEXT,
    foto VARCHAR(255),
    token_recuperacao VARCHAR(255),
    expiracao_recuperacao DATETIME,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);


-- =====================================================
-- TABELA: MONITOR
-- =====================================================

CREATE TABLE monitor (
    id_monitor INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    senha VARCHAR(255),
    telefone VARCHAR(20),
    foto VARCHAR(255),
    token_recuperacao VARCHAR(255),
    expiracao_recuperacao DATETIME,
    id_condutor INT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    FOREIGN KEY (id_condutor)
        REFERENCES condutor(id_condutor)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =====================================================
-- TABELA: RESPONSAVEL
-- =====================================================

CREATE TABLE responsavel (
    id_responsavel INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    telefone_emergencia VARCHAR(20),
    email VARCHAR(100),
    endereco VARCHAR(255) NOT NULL,
    quantidade_alunos INT NOT NULL DEFAULT 1,

    UNIQUE KEY uk_responsavel_telefone (telefone),
    UNIQUE KEY uk_responsavel_telefone_emergencia (telefone_emergencia),
    UNIQUE KEY uk_responsavel_email (email),

    CONSTRAINT chk_responsavel_telefones_diferentes
        CHECK (
            telefone_emergencia IS NULL
            OR telefone_emergencia <> telefone
        ),

    CONSTRAINT chk_responsavel_telefone_formato
        CHECK (telefone REGEXP '^[0-9]{10,11}$'),

    CONSTRAINT chk_responsavel_telefone_emergencia_formato
        CHECK (
            telefone_emergencia IS NULL
            OR telefone_emergencia REGEXP '^[0-9]{10,11}$'
        ),

    CONSTRAINT chk_responsavel_quantidade_alunos
        CHECK (quantidade_alunos >= 1)
);

DELIMITER //
CREATE TRIGGER trg_responsavel_telefone_unico_insert
BEFORE INSERT ON responsavel
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1
        FROM responsavel r
        WHERE r.telefone = NEW.telefone
           OR (
                NEW.telefone_emergencia IS NOT NULL
                AND r.telefone = NEW.telefone_emergencia
           )
           OR (
                r.telefone_emergencia IS NOT NULL
                AND r.telefone_emergencia = NEW.telefone
           )
           OR (
                NEW.telefone_emergencia IS NOT NULL
                AND r.telefone_emergencia = NEW.telefone_emergencia
           )
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Telefone já cadastrado para outro responsável.';
    END IF;
END//

CREATE TRIGGER trg_responsavel_telefone_unico_update
BEFORE UPDATE ON responsavel
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1
        FROM responsavel r
        WHERE r.id_responsavel <> NEW.id_responsavel
          AND (
                r.telefone = NEW.telefone
             OR (
                    NEW.telefone_emergencia IS NOT NULL
                    AND r.telefone = NEW.telefone_emergencia
                )
             OR (
                    r.telefone_emergencia IS NOT NULL
                    AND r.telefone_emergencia = NEW.telefone
                )
             OR (
                    NEW.telefone_emergencia IS NOT NULL
                    AND r.telefone_emergencia = NEW.telefone_emergencia
                )
          )
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Telefone já cadastrado para outro responsável.';
    END IF;
END//
DELIMITER ;


-- =====================================================
-- TABELA: ESCOLA
-- =====================================================

CREATE TABLE escola (
    id_escola INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    endereco VARCHAR(255)
);


-- =====================================================
-- TABELA: ALUNO
-- =====================================================

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
    dia_vencimento TINYINT,
    necessidade_acessibilidade_temporaria BOOLEAN DEFAULT FALSE,
    necessidade_acessibilidade_permanente BOOLEAN DEFAULT FALSE,
    observacao_acessibilidade TEXT,

    id_responsavel INT NOT NULL,
    id_condutor INT,

    CONSTRAINT chk_aluno_dia_vencimento
        CHECK (
            dia_vencimento IS NULL
            OR dia_vencimento BETWEEN 1 AND 31
        ),

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


-- =====================================================
-- TABELA: ORCAMENTO
-- =====================================================

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
    status ENUM(
        'PENDENTE',
        'EM_CADASTRO',
        'CONVERTIDO',
        'RECUSADO'
    ) DEFAULT 'PENDENTE',
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


-- =====================================================
-- TABELA: PRESENCA
-- =====================================================

CREATE TABLE presenca (
    id_presenca INT AUTO_INCREMENT PRIMARY KEY,
    id_aluno INT NOT NULL,
    data DATE NOT NULL,
    turno ENUM('MANHA','TARDE','NOITE') NOT NULL,
    tipo ENUM('IDA','VOLTA') NOT NULL,
    status ENUM('PRESENTE','AUSENTE') NOT NULL,
    observacao TEXT NULL,

    UNIQUE KEY uk_presenca_aluno_data_turno_tipo (
        id_aluno,
        data,
        turno,
        tipo
    ),

    FOREIGN KEY (id_aluno)
        REFERENCES aluno(id_aluno)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =====================================================
-- TABELA: MENSALIDADE
-- =====================================================

CREATE TABLE mensalidade (
    id_mensalidade INT AUTO_INCREMENT PRIMARY KEY,
    id_aluno INT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status ENUM(
        'PAGO',
        'PENDENTE',
        'ATRASADO'
    ) DEFAULT 'PENDENTE',
    id_condutor INT,
    mes_referencia CHAR(7) NOT NULL,

    FOREIGN KEY (id_aluno)
        REFERENCES aluno(id_aluno)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (id_condutor)
        REFERENCES condutor(id_condutor)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    UNIQUE KEY uk_aluno_mes_referencia (
        id_aluno,
        mes_referencia
    )
);


-- =====================================================
-- TABELA: DOCUMENTO
-- =====================================================

CREATE TABLE documento (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    tipo_documento VARCHAR(100) NOT NULL,
    data_emissao DATE,
    data_validade DATE,
    status ENUM(
        'VALIDO',
        'VENCIDO'
    ) DEFAULT 'VALIDO',
    id_condutor INT,

    FOREIGN KEY (id_condutor)
        REFERENCES condutor(id_condutor)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =====================================================
-- TABELA: NOTIFICACAO
-- =====================================================
-- Armazena notificações individuais do sistema.
--
-- A notificação pode ser vinculada a um registro específico
-- através de entidade_tipo + entidade_id.
--
-- Exemplos:
--
-- DOCUMENTO_VENCIDO
-- entidade_tipo = 'documento'
-- entidade_id   = 3
--
-- NOVO_ORCAMENTO
-- entidade_tipo = 'orcamento'
-- entidade_id   = 5
-- =====================================================

CREATE TABLE notificacao (
    id_notificacao INT AUTO_INCREMENT PRIMARY KEY,

    id_condutor INT NOT NULL,

    tipo VARCHAR(50) NOT NULL,

    titulo VARCHAR(150) NOT NULL,
    mensagem TEXT NOT NULL,

    prioridade ENUM(
        'BAIXA',
        'MEDIA',
        'ALTA',
        'CRITICA'
    ) NOT NULL DEFAULT 'MEDIA',

    lida BOOLEAN NOT NULL DEFAULT FALSE,
    resolvida BOOLEAN NOT NULL DEFAULT FALSE,

    entidade_tipo VARCHAR(50),
    entidade_id INT,

    data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_leitura DATETIME NULL,
    data_resolucao DATETIME NULL,
    data_expiracao DATETIME NULL,

    FOREIGN KEY (id_condutor)
        REFERENCES condutor(id_condutor)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- =====================================================
-- TABELA: DESPESA
-- =====================================================

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


-- =====================================================
-- SEED
-- =====================================================


-- =====================================================
-- CONDUTOR
-- Login:
-- liametechnologies@gmail.com
-- Senha:
-- Prote1234
-- =====================================================

INSERT INTO condutor (
    nome,
    email,
    senha,
    telefone,
    cnh,
    escolas,
    foto,
    ativo
) VALUES (
    'WAGNER RIBEIRO DE BRITO',
    'liametechnologies@gmail.com',
    '$2a$10$S4T6MlgCnSowCx9Vz4X4xeAsO4.G8U5RjnxczS70C/qbni4Q1uDzi',
    '(11) 98888-1234',
    '02650306461',
    NULL,
    NULL,
    TRUE
);


-- =====================================================
-- ESCOLAS (fictícias)
-- =====================================================

INSERT INTO escola (nome, endereco) VALUES
('Creche Basileia', 'Rua Dr. Soares Brandão Filho, 40 - Vila Basileia'),
('Escola Gastão Montinho', 'Rua das Palmeiras, 220 - Vila Amélia');


-- =====================================================
-- RESPONSÁVEIS (fictícios; 1 aluno por responsável)
-- =====================================================

INSERT INTO responsavel (nome, telefone, telefone_emergencia, email, endereco, quantidade_alunos) VALUES
('Fernanda Albuquerque',  '11971230001', '11981230002', 'fernanda.albuquerque@exemplo.com', 'Rua das Acácias, 120 - Vila Aurora', 1),
('Ricardo Matsumoto',     '11971230003', '11981230004', 'ricardo.matsumoto@exemplo.com',    'Rua dos Ipês, 85 - Horto Florestal', 1),
('Juliana Prado',         '11971230005', '11981230006', 'juliana.prado@exemplo.com',        'Rua Alvorada, 310 - Vila Amélia', 1),
('Carlos Eduardo Lemos',  '11971230007', '11981230008', 'carlos.lemos@exemplo.com',         'Rua Bela Vista, 45 - Pedra Branca', 1),
('Patrícia Nogueira',     '11971230009', '11981230010', 'patricia.nogueira@exemplo.com',    'Rua Tucuruvi, 270 - Lauzane Paulista', 1),
('Marcos Vinícius Freitas','11971230011','11981230012', 'marcos.freitas@exemplo.com',       'Rua das Hortênsias, 18 - Vila Amélia', 1),
('Aline Cavalcanti',      '11971230013', '11981230014', 'aline.cavalcanti@exemplo.com',     'Rua Jasmim, 402 - Vila Aurora', 1),
('Rodrigo Tavares',       '11971230015', '11981230016', 'rodrigo.tavares@exemplo.com',      'Rua Sete de Setembro, 66 - Horto Florestal', 1),
('Beatriz Carvalho',      '11971230017', '11981230018', 'beatriz.carvalho@exemplo.com',     'Rua Esmeralda, 150 - Lauzane Paulista', 1),
('Daniel Moreira',        '11971230019', '11981230020', 'daniel.moreira@exemplo.com',       'Rua Sol Nascente, 233 - Pedra Branca', 1);


-- =====================================================
-- ALUNOS (fictícios)
-- Creche Basileia (id 1): turno MANHA
-- Escola Gastão Montinho (id 2): MANHA e TARDE
-- =====================================================

INSERT INTO aluno (nome, bairro, id_escola, turno, endereco_embarque, endereco_desembarque, tipo_trajeto, foto, dia_vencimento, necessidade_acessibilidade_temporaria, necessidade_acessibilidade_permanente, observacao_acessibilidade, id_responsavel, id_condutor) VALUES
('Helena Albuquerque', 'Vila Aurora',      1, 'MANHA', 'Rua das Acácias, 120 - Vila Aurora',          'Rua Dr. Soares Brandão Filho, 40 - Vila Basileia', 'AMBOS', NULL,  2, FALSE, FALSE, NULL, 1, 1),
('Thiago Matsumoto',   'Horto Florestal',  1, 'MANHA', 'Rua dos Ipês, 85 - Horto Florestal',          'Rua Dr. Soares Brandão Filho, 40 - Vila Basileia', 'IDA',   NULL,  4, FALSE, FALSE, NULL, 2, 1),
('Sofia Prado',        'Vila Amélia',      1, 'MANHA', 'Rua Alvorada, 310 - Vila Amélia',             'Rua Dr. Soares Brandão Filho, 40 - Vila Basileia', 'AMBOS', NULL,  4, FALSE, TRUE,  'Usa aparelho auditivo; sentar próximo ao condutor.', 3, 1),
('Enzo Lemos',         'Pedra Branca',     1, 'MANHA', 'Rua Bela Vista, 45 - Pedra Branca',           'Rua Dr. Soares Brandão Filho, 40 - Vila Basileia', 'VOLTA', NULL,  5, FALSE, FALSE, NULL, 4, 1),
('Laura Nogueira',     'Lauzane Paulista', 2, 'MANHA', 'Rua Tucuruvi, 270 - Lauzane Paulista',        'Rua das Palmeiras, 220 - Vila Amélia',             'AMBOS', NULL,  6, FALSE, FALSE, NULL, 5, 1),
('Gabriel Freitas',    'Vila Amélia',      2, 'MANHA', 'Rua das Hortênsias, 18 - Vila Amélia',        'Rua das Palmeiras, 220 - Vila Amélia',             'IDA',   NULL,  6, TRUE,  FALSE, 'Imobilização no pé direito; necessita auxílio para embarque.', 6, 1),
('Alice Cavalcanti',   'Vila Aurora',      2, 'MANHA', 'Rua Jasmim, 402 - Vila Aurora',               'Rua das Palmeiras, 220 - Vila Amélia',             'AMBOS', NULL, 10, FALSE, FALSE, NULL, 7, 1),
('Pedro Tavares',      'Horto Florestal',  2, 'TARDE', 'Rua Sete de Setembro, 66 - Horto Florestal',  'Rua das Palmeiras, 220 - Vila Amélia',             'AMBOS', NULL, 10, FALSE, FALSE, NULL, 8, 1),
('Valentina Carvalho', 'Lauzane Paulista', 2, 'TARDE', 'Rua Esmeralda, 150 - Lauzane Paulista',       'Rua das Palmeiras, 220 - Vila Amélia',             'VOLTA', NULL, 15, FALSE, FALSE, NULL, 9, 1),
('Miguel Moreira',     'Pedra Branca',     2, 'TARDE', 'Rua Sol Nascente, 233 - Pedra Branca',        'Rua das Palmeiras, 220 - Vila Amélia',             'AMBOS', NULL, 20, FALSE, FALSE, NULL, 10, 1);


-- PRESENÇA, ORÇAMENTO, DOCUMENTO e NOTIFICAÇÃO: mantidas vazias.


-- =====================================================
-- MENSALIDADES: janeiro a novembro/2026 (110 registros)
-- Data de referência da seed: 12/11/2026
-- =====================================================
INSERT INTO mensalidade (id_aluno, valor, data_vencimento, data_pagamento, status, id_condutor, mes_referencia) VALUES
(1, 230.00, '2026-01-02', '2026-01-03', 'PAGO', 1, '2026-01'),
(2, 235.00, '2026-01-04', '2026-01-01', 'PAGO', 1, '2026-01'),
(3, 225.00, '2026-01-04', '2026-01-01', 'PAGO', 1, '2026-01'),
(4, 200.00, '2026-01-05', '2026-01-01', 'PAGO', 1, '2026-01'),
(5, 230.00, '2026-01-06', '2026-01-03', 'PAGO', 1, '2026-01'),
(6, 180.00, '2026-01-06', '2026-01-02', 'PAGO', 1, '2026-01'),
(7, 170.00, '2026-01-10', '2026-01-10', 'PAGO', 1, '2026-01'),
(8, 135.00, '2026-01-10', '2026-01-10', 'PAGO', 1, '2026-01'),
(9, 220.00, '2026-01-15', '2026-01-15', 'PAGO', 1, '2026-01'),
(10, 210.00, '2026-01-20', '2026-01-15', 'PAGO', 1, '2026-01'),
(1, 230.00, '2026-02-02', '2026-02-01', 'PAGO', 1, '2026-02'),
(2, 235.00, '2026-02-04', '2026-02-02', 'PAGO', 1, '2026-02'),
(3, 225.00, '2026-02-04', '2026-02-02', 'PAGO', 1, '2026-02'),
(4, 200.00, '2026-02-05', '2026-02-01', 'PAGO', 1, '2026-02'),
(5, 230.00, '2026-02-06', '2026-02-06', 'PAGO', 1, '2026-02'),
(6, 180.00, '2026-02-06', '2026-02-06', 'PAGO', 1, '2026-02'),
(7, 170.00, '2026-02-10', '2026-02-08', 'PAGO', 1, '2026-02'),
(8, 135.00, '2026-02-10', '2026-02-09', 'PAGO', 1, '2026-02'),
(9, 220.00, '2026-02-15', '2026-02-10', 'PAGO', 1, '2026-02'),
(10, 210.00, '2026-02-20', '2026-02-18', 'PAGO', 1, '2026-02'),
(1, 230.00, '2026-03-02', '2026-03-05', 'PAGO', 1, '2026-03'),
(2, 235.00, '2026-03-04', '2026-03-01', 'PAGO', 1, '2026-03'),
(3, 225.00, '2026-03-04', '2026-03-08', 'PAGO', 1, '2026-03'),
(4, 200.00, '2026-03-05', '2026-03-02', 'PAGO', 1, '2026-03'),
(5, 230.00, '2026-03-06', '2026-03-02', 'PAGO', 1, '2026-03'),
(6, 180.00, '2026-03-06', '2026-03-03', 'PAGO', 1, '2026-03'),
(7, 170.00, '2026-03-10', '2026-03-08', 'PAGO', 1, '2026-03'),
(8, 135.00, '2026-03-10', '2026-03-06', 'PAGO', 1, '2026-03'),
(9, 220.00, '2026-03-15', '2026-03-12', 'PAGO', 1, '2026-03'),
(10, 210.00, '2026-03-20', '2026-03-20', 'PAGO', 1, '2026-03'),
(1, 230.00, '2026-04-02', '2026-04-01', 'PAGO', 1, '2026-04'),
(2, 235.00, '2026-04-04', '2026-04-01', 'PAGO', 1, '2026-04'),
(3, 225.00, '2026-04-04', '2026-04-01', 'PAGO', 1, '2026-04'),
(4, 200.00, '2026-04-05', '2026-04-09', 'PAGO', 1, '2026-04'),
(5, 230.00, '2026-04-06', '2026-04-03', 'PAGO', 1, '2026-04'),
(6, 180.00, '2026-04-06', '2026-04-06', 'PAGO', 1, '2026-04'),
(7, 170.00, '2026-04-10', '2026-04-07', 'PAGO', 1, '2026-04'),
(8, 135.00, '2026-04-10', '2026-04-05', 'PAGO', 1, '2026-04'),
(9, 220.00, '2026-04-15', '2026-04-11', 'PAGO', 1, '2026-04'),
(10, 210.00, '2026-04-20', '2026-04-17', 'PAGO', 1, '2026-04'),
(1, 230.00, '2026-05-02', '2026-05-01', 'PAGO', 1, '2026-05'),
(2, 235.00, '2026-05-04', '2026-05-01', 'PAGO', 1, '2026-05'),
(3, 225.00, '2026-05-04', '2026-05-01', 'PAGO', 1, '2026-05'),
(4, 200.00, '2026-05-05', '2026-05-02', 'PAGO', 1, '2026-05'),
(5, 230.00, '2026-05-06', '2026-05-04', 'PAGO', 1, '2026-05'),
(6, 180.00, '2026-05-06', '2026-05-06', 'PAGO', 1, '2026-05'),
(7, 170.00, '2026-05-10', '2026-05-14', 'PAGO', 1, '2026-05'),
(8, 135.00, '2026-05-10', '2026-05-07', 'PAGO', 1, '2026-05'),
(9, 220.00, '2026-05-15', '2026-05-14', 'PAGO', 1, '2026-05'),
(10, 210.00, '2026-05-20', '2026-05-17', 'PAGO', 1, '2026-05'),
(1, 230.00, '2026-06-02', '2026-06-01', 'PAGO', 1, '2026-06'),
(2, 235.00, '2026-06-04', '2026-06-01', 'PAGO', 1, '2026-06'),
(3, 225.00, '2026-06-04', '2026-06-04', 'PAGO', 1, '2026-06'),
(4, 200.00, '2026-06-05', '2026-06-03', 'PAGO', 1, '2026-06'),
(5, 230.00, '2026-06-06', '2026-06-06', 'PAGO', 1, '2026-06'),
(6, 180.00, '2026-06-06', '2026-06-01', 'PAGO', 1, '2026-06'),
(7, 170.00, '2026-06-10', '2026-06-06', 'PAGO', 1, '2026-06'),
(8, 135.00, '2026-06-10', '2026-06-09', 'PAGO', 1, '2026-06'),
(9, 220.00, '2026-06-15', '2026-06-10', 'PAGO', 1, '2026-06'),
(10, 210.00, '2026-06-20', '2026-06-20', 'PAGO', 1, '2026-06'),
(1, 230.00, '2026-07-02', '2026-07-01', 'PAGO', 1, '2026-07'),
(2, 235.00, '2026-07-04', '2026-07-03', 'PAGO', 1, '2026-07'),
(3, 225.00, '2026-07-04', '2026-07-01', 'PAGO', 1, '2026-07'),
(4, 200.00, '2026-07-05', '2026-07-06', 'PAGO', 1, '2026-07'),
(5, 230.00, '2026-07-06', '2026-07-10', 'PAGO', 1, '2026-07'),
(6, 180.00, '2026-07-06', '2026-07-06', 'PAGO', 1, '2026-07'),
(7, 170.00, '2026-07-10', '2026-07-09', 'PAGO', 1, '2026-07'),
(8, 135.00, '2026-07-10', '2026-07-06', 'PAGO', 1, '2026-07'),
(9, 220.00, '2026-07-15', '2026-07-18', 'PAGO', 1, '2026-07'),
(10, 210.00, '2026-07-20', '2026-07-15', 'PAGO', 1, '2026-07'),
(1, 230.00, '2026-08-02', '2026-08-02', 'PAGO', 1, '2026-08'),
(2, 235.00, '2026-08-04', '2026-08-01', 'PAGO', 1, '2026-08'),
(3, 225.00, '2026-08-04', '2026-08-01', 'PAGO', 1, '2026-08'),
(4, 200.00, '2026-08-05', '2026-08-04', 'PAGO', 1, '2026-08'),
(5, 230.00, '2026-08-06', '2026-08-03', 'PAGO', 1, '2026-08'),
(6, 180.00, '2026-08-06', '2026-08-02', 'PAGO', 1, '2026-08'),
(7, 170.00, '2026-08-10', '2026-08-06', 'PAGO', 1, '2026-08'),
(8, 135.00, '2026-08-10', '2026-08-07', 'PAGO', 1, '2026-08'),
(9, 220.00, '2026-08-15', '2026-08-14', 'PAGO', 1, '2026-08'),
(10, 210.00, '2026-08-20', '2026-08-16', 'PAGO', 1, '2026-08'),
(1, 230.00, '2026-09-02', '2026-09-01', 'PAGO', 1, '2026-09'),
(2, 235.00, '2026-09-04', '2026-09-03', 'PAGO', 1, '2026-09'),
(3, 225.00, '2026-09-04', '2026-09-03', 'PAGO', 1, '2026-09'),
(4, 200.00, '2026-09-05', '2026-09-05', 'PAGO', 1, '2026-09'),
(5, 230.00, '2026-09-06', '2026-09-06', 'PAGO', 1, '2026-09'),
(6, 180.00, '2026-09-06', '2026-09-09', 'PAGO', 1, '2026-09'),
(7, 170.00, '2026-09-10', '2026-09-10', 'PAGO', 1, '2026-09'),
(8, 135.00, '2026-09-10', '2026-09-14', 'PAGO', 1, '2026-09'),
(9, 220.00, '2026-09-15', '2026-09-13', 'PAGO', 1, '2026-09'),
(10, 210.00, '2026-09-20', '2026-09-20', 'PAGO', 1, '2026-09'),
(1, 230.00, '2026-10-02', '2026-10-01', 'PAGO', 1, '2026-10'),
(2, 235.00, '2026-10-04', '2026-10-03', 'PAGO', 1, '2026-10'),
(3, 225.00, '2026-10-04', '2026-10-01', 'PAGO', 1, '2026-10'),
(4, 200.00, '2026-10-05', NULL, 'ATRASADO', 1, '2026-10'),
(5, 230.00, '2026-10-06', '2026-10-02', 'PAGO', 1, '2026-10'),
(6, 180.00, '2026-10-06', '2026-10-02', 'PAGO', 1, '2026-10'),
(7, 170.00, '2026-10-10', '2026-10-05', 'PAGO', 1, '2026-10'),
(8, 135.00, '2026-10-10', '2026-10-14', 'PAGO', 1, '2026-10'),
(9, 220.00, '2026-10-15', '2026-10-17', 'PAGO', 1, '2026-10'),
(10, 210.00, '2026-10-20', '2026-10-21', 'PAGO', 1, '2026-10'),
(1, 230.00, '2026-11-02', '2026-11-01', 'PAGO', 1, '2026-11'),
(2, 235.00, '2026-11-04', '2026-11-01', 'PAGO', 1, '2026-11'),
(3, 225.00, '2026-11-04', '2026-11-04', 'PAGO', 1, '2026-11'),
(4, 200.00, '2026-11-05', NULL, 'ATRASADO', 1, '2026-11'),
(5, 230.00, '2026-11-06', '2026-11-08', 'PAGO', 1, '2026-11'),
(6, 180.00, '2026-11-06', '2026-11-02', 'PAGO', 1, '2026-11'),
(7, 170.00, '2026-11-10', NULL, 'ATRASADO', 1, '2026-11'),
(8, 135.00, '2026-11-10', '2026-11-09', 'PAGO', 1, '2026-11'),
(9, 220.00, '2026-11-15', NULL, 'PENDENTE', 1, '2026-11'),
(10, 210.00, '2026-11-20', NULL, 'PENDENTE', 1, '2026-11');


-- =====================================================
-- DESPESAS: janeiro a novembro/2026
-- =====================================================
INSERT INTO despesa (tipo, descricao, valor, data, id_condutor) VALUES
('Combustível', 'Abastecimento - semana 1', 255.66, '2026-01-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-01-05', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-01-08', 1),
('Combustível', 'Abastecimento - semana 2', 365.10, '2026-01-10', 1),
('IPVA', 'IPVA 2026 - parcela 1/3', 612.40, '2026-01-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-01-12', 1),
('Lavagem', 'Lavagem e higienização interna da van', 90.00, '2026-01-15', 1),
('Combustível', 'Abastecimento - semana 3', 292.40, '2026-01-17', 1),
('Combustível', 'Abastecimento - semana 4', 298.06, '2026-01-24', 1),
('Lavagem', 'Lavagem completa da van', 90.00, '2026-01-28', 1),
('Combustível', 'Abastecimento - semana 1', 296.25, '2026-02-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-02-05', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-02-08', 1),
('Combustível', 'Abastecimento - semana 2', 242.59, '2026-02-10', 1),
('IPVA', 'IPVA 2026 - parcela 2/3', 612.40, '2026-02-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-02-12', 1),
('Lavagem', 'Lavagem e higienização interna da van', 90.00, '2026-02-15', 1),
('Combustível', 'Abastecimento - semana 3', 278.79, '2026-02-17', 1),
('Manutenção', 'Revisão geral (óleo, filtros e alinhamento)', 780.00, '2026-02-18', 1),
('Combustível', 'Abastecimento - semana 4', 285.05, '2026-02-24', 1),
('Lavagem', 'Lavagem completa da van', 90.00, '2026-02-28', 1),
('Combustível', 'Abastecimento - semana 1', 272.15, '2026-03-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-03-05', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-03-08', 1),
('Combustível', 'Abastecimento - semana 2', 309.62, '2026-03-10', 1),
('IPVA', 'IPVA 2026 - parcela 3/3', 612.40, '2026-03-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-03-12', 1),
('Lavagem', 'Lavagem e higienização interna da van', 90.00, '2026-03-15', 1),
('Combustível', 'Abastecimento - semana 3', 354.84, '2026-03-17', 1),
('Combustível', 'Abastecimento - semana 4', 296.52, '2026-03-24', 1),
('Lavagem', 'Lavagem completa da van', 90.00, '2026-03-28', 1),
('Combustível', 'Abastecimento - semana 1', 304.83, '2026-04-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-04-05', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-04-08', 1),
('Combustível', 'Abastecimento - semana 2', 282.13, '2026-04-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-04-12', 1),
('Licenciamento', 'Licenciamento anual do veículo', 180.00, '2026-04-14', 1),
('Lavagem', 'Lavagem e higienização interna da van', 90.00, '2026-04-15', 1),
('Combustível', 'Abastecimento - semana 3', 307.13, '2026-04-17', 1),
('Manutenção', 'Troca de pneus dianteiros', 1450.00, '2026-04-22', 1),
('Combustível', 'Abastecimento - semana 4', 249.22, '2026-04-24', 1),
('Lavagem', 'Lavagem completa da van', 90.00, '2026-04-28', 1),
('Combustível', 'Abastecimento - semana 1', 357.46, '2026-05-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-05-05', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-05-08', 1),
('Combustível', 'Abastecimento - semana 2', 357.47, '2026-05-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-05-12', 1),
('Lavagem', 'Lavagem e higienização interna da van', 90.00, '2026-05-15', 1),
('Combustível', 'Abastecimento - semana 3', 360.58, '2026-05-17', 1),
('Combustível', 'Abastecimento - semana 4', 365.66, '2026-05-24', 1),
('Lavagem', 'Lavagem completa da van', 90.00, '2026-05-28', 1),
('Combustível', 'Abastecimento - semana 1', 267.01, '2026-06-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-06-05', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-06-08', 1),
('Combustível', 'Abastecimento - semana 2', 382.59, '2026-06-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-06-12', 1),
('Lavagem', 'Lavagem e higienização interna da van', 90.00, '2026-06-15', 1),
('Combustível', 'Abastecimento - semana 3', 370.58, '2026-06-17', 1),
('Manutenção', 'Troca de pastilhas e discos de freio', 960.00, '2026-06-19', 1),
('Combustível', 'Abastecimento - semana 4', 333.31, '2026-06-24', 1),
('Lavagem', 'Lavagem completa da van', 90.00, '2026-06-28', 1),
('Combustível', 'Abastecimento - semana 1', 295.28, '2026-07-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-07-05', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-07-08', 1),
('Vistoria', 'Vistoria semestral do transporte escolar', 210.00, '2026-07-09', 1),
('Combustível', 'Abastecimento - semana 2', 355.33, '2026-07-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-07-12', 1),
('Lavagem', 'Lavagem e higienização interna da van', 90.00, '2026-07-15', 1),
('Combustível', 'Abastecimento - semana 3', 365.92, '2026-07-17', 1),
('Combustível', 'Abastecimento - semana 4', 337.26, '2026-07-24', 1),
('Lavagem', 'Lavagem completa da van', 90.00, '2026-07-28', 1),
('Combustível', 'Abastecimento - semana 1', 383.79, '2026-08-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-08-05', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-08-08', 1),
('Combustível', 'Abastecimento - semana 2', 286.31, '2026-08-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-08-12', 1),
('Lavagem', 'Lavagem e higienização interna da van', 90.00, '2026-08-15', 1),
('Combustível', 'Abastecimento - semana 3', 255.08, '2026-08-17', 1),
('Manutenção', 'Troca de óleo e filtros', 320.00, '2026-08-21', 1),
('Combustível', 'Abastecimento - semana 4', 319.92, '2026-08-24', 1),
('Lavagem', 'Lavagem completa da van', 90.00, '2026-08-28', 1),
('Combustível', 'Abastecimento - semana 1', 321.57, '2026-09-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-09-05', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-09-08', 1),
('Combustível', 'Abastecimento - semana 2', 316.14, '2026-09-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-09-12', 1),
('Lavagem', 'Lavagem e higienização interna da van', 90.00, '2026-09-15', 1),
('Combustível', 'Abastecimento - semana 3', 247.55, '2026-09-17', 1),
('Combustível', 'Abastecimento - semana 4', 344.56, '2026-09-24', 1),
('Lavagem', 'Lavagem completa da van', 90.00, '2026-09-28', 1),
('Combustível', 'Abastecimento - semana 1', 318.93, '2026-10-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-10-05', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-10-08', 1),
('Combustível', 'Abastecimento - semana 2', 320.89, '2026-10-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-10-12', 1),
('Lavagem', 'Lavagem e higienização interna da van', 90.00, '2026-10-15', 1),
('Manutenção', 'Reparo do ar-condicionado', 540.00, '2026-10-16', 1),
('Combustível', 'Abastecimento - semana 3', 264.31, '2026-10-17', 1),
('Combustível', 'Abastecimento - semana 4', 277.15, '2026-10-24', 1),
('Lavagem', 'Lavagem completa da van', 90.00, '2026-10-28', 1),
('Combustível', 'Abastecimento - semana 1', 272.90, '2026-11-03', 1),
('Salário Monitor', 'Pagamento mensal do monitor', 1650.00, '2026-11-05', 1),
('Manutenção', 'Troca da bateria', 480.00, '2026-11-06', 1),
('Seguro', 'Parcela mensal do seguro do veículo', 428.90, '2026-11-08', 1),
('Combustível', 'Abastecimento - semana 2', 318.92, '2026-11-10', 1),
('Telefone', 'Plano de celular/dados do condutor', 99.90, '2026-11-12', 1);


-- =====================================================
-- CONSULTAS DE TESTE
-- =====================================================

SELECT * FROM condutor;

SELECT * FROM monitor;

SELECT * FROM responsavel;

SELECT * FROM escola;

SELECT * FROM aluno;

SELECT *
FROM presenca
ORDER BY data, turno, id_aluno;

SELECT * FROM mensalidade;

SELECT * FROM orcamento;

SELECT * FROM documento;

SELECT * FROM notificacao;

SELECT * FROM despesa;


-- =====================================================
-- CONFERÊNCIAS
-- =====================================================

-- Alunos por escola
SELECT e.nome, COUNT(a.id_aluno) AS total_alunos
FROM escola e
LEFT JOIN aluno a ON a.id_escola = e.id_escola
GROUP BY e.id_escola, e.nome;

-- Alunos por escola e turno
SELECT e.nome AS escola, a.turno, COUNT(*) AS total_alunos
FROM aluno a
JOIN escola e ON e.id_escola = a.id_escola
GROUP BY e.nome, a.turno
ORDER BY e.nome, a.turno;

-- Alunos por tipo de trajeto
SELECT tipo_trajeto, COUNT(*) AS total_alunos
FROM aluno
GROUP BY tipo_trajeto;

-- Mensalidades por mês e status
SELECT mes_referencia, status, COUNT(*) AS quantidade, SUM(valor) AS total
FROM mensalidade
GROUP BY mes_referencia, status
ORDER BY mes_referencia, status;

-- Despesas por mês
SELECT DATE_FORMAT(data, '%Y-%m') AS mes, SUM(valor) AS total_despesas
FROM despesa
GROUP BY DATE_FORMAT(data, '%Y-%m')
ORDER BY mes;

-- Receita recebida x despesas por mês
SELECT m.mes_referencia AS mes,
       SUM(CASE WHEN m.status = 'PAGO' THEN m.valor ELSE 0 END) AS receita_paga,
       (SELECT COALESCE(SUM(d.valor), 0)
          FROM despesa d
         WHERE DATE_FORMAT(d.data, '%Y-%m') = m.mes_referencia) AS despesas
FROM mensalidade m
GROUP BY m.mes_referencia
ORDER BY m.mes_referencia;

-- =====================================================
-- FIM DO SCHEMA + SEED
-- =====================================================