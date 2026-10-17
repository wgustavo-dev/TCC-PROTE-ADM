-- =====================================================
-- SCHEMA PROTE ADM - v1.15
-- =====================================================
-- Estrutura completa + seed de testes
--
-- Alterações da v1.15:
-- 1) Adicionado telefone_emergencia opcional para responsáveis.
--
-- Alterações da v1.14:
-- 1) Adicionada tabela de notificações.
-- 2) Notificações vinculadas ao condutor responsável.
-- 3) Suporte a notificações lidas e resolvidas.
-- 4) Suporte a vínculo da notificação com registros
--    específicos do sistema.
-- 5) Adicionados os campos de acessibilidade no aluno:
--    necessidade_acessibilidade_temporaria,
--    necessidade_acessibilidade_permanente,
--    observacao_acessibilidade.
-- 6) Campo cnh no condutor passou a ser obrigatório e
--    único para identificar a habilitação do motorista.
-- 7) Presença diferencia IDA e VOLTA pelo campo tipo.
-- 8) Presença aceita observação opcional para ausências.
-- 9) A chave única da presença inclui aluno, data, turno e tipo.
--
-- v1.13:
-- 1) Notificações vinculadas ao condutor e aos registros do sistema.
-- 2) Campos de acessibilidade adicionados ao aluno.
-- 3) CNH obrigatória e única no condutor.
--
-- v1.12:
-- 1) presenca.turno diferencia MANHA, TARDE e NOITE.
-- 2) presença é única por id_aluno + data + turno.
-- 3) não há migração de registros antigos sem turno.
--
-- Observações gerais do banco atual:
-- - Alunos podem registrar necessidades temporárias ou
--   permanentes de acessibilidade, além de uma observação
--   complementar de saúde/deficiência.
-- - A informação de acessibilidade fica vinculada ao aluno,
--   sendo exibida nos módulos de Alunos, Itinerário e Presença.
-- - O condutor possui cadastro obrigatório de CNH, usado
--   para validação e vínculo do transporte escolar.
--
-- Seed incluída:
-- - 1 condutor
-- - 2 monitores
-- - 2 escolas
-- - 10 responsáveis
-- - 20 alunos (10 por escola)
-- - itinerários de MANHA e TARDE
-- - presenças de MANHA e TARDE
-- - teste do mesmo aluno em dois turnos no mesmo dia
-- - mensalidades para todos os alunos
-- - orçamentos
-- - documentos
-- - despesas
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
-- TABELA: ITINERARIO_ALUNO
-- =====================================================

CREATE TABLE itinerario_aluno (
    id_itinerario INT AUTO_INCREMENT PRIMARY KEY,
    id_aluno INT NOT NULL,
    id_condutor INT NOT NULL,
    turno ENUM('MANHA','TARDE','NOITE') NOT NULL,
    tipo ENUM('IDA','VOLTA') NOT NULL,
    ordem INT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_aluno)
        REFERENCES aluno(id_aluno)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    FOREIGN KEY (id_condutor)
        REFERENCES condutor(id_condutor)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    UNIQUE KEY uk_aluno_turno_tipo (
        id_aluno,
        turno,
        tipo
    )
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
-- MONITORES
-- =====================================================

INSERT INTO monitor (
    nome,
    email,
    senha,
    telefone,
    foto,
    id_condutor,
    ativo
) VALUES
(
    'EDILEIDE BATISTA',
    'monitor@gmail.com',
    '$2a$10$S4T6MlgCnSowCx9Vz4X4xeAsO4.G8U5RjnxczS70C/qbni4Q1uDzi',
    '(11) 97777-5678',
    NULL,
    1,
    TRUE
),
(
    'Mariana Alves Costa',
    'mariana@gmail.com',
    '$2a$10$S4T6MlgCnSowCx9Vz4X4xeAsO4.G8U5RjnxczS70C/qbni4Q1uDzi',
    '(11) 96666-4321',
    NULL,
    1,
    TRUE
);


-- =====================================================
-- ESCOLAS
-- =====================================================

INSERT INTO escola (
    nome,
    endereco
) VALUES
(
    'Creche CEI Vila Basileia',
    'Rua Dr. Soares Brandão Filho, 40 - Vila Basileia'
),
(
    'EMEF Comandante Gastão Moutinho',
    'Rua Coronel João da Silva Feijó, 40 - Parque Mandaqui'
);


-- =====================================================
-- RESPONSÁVEIS
-- =====================================================

INSERT INTO responsavel (
    nome,
    telefone,
    telefone_emergencia,
    email,
    endereco,
    quantidade_alunos
) VALUES
(
    'Ana Paula Ferreira',
    '11911110001',
    '11988880001',
    'ana.ferreira@gmail.com',
    'Rua Dr. Soares Brandão Filho, 120 - Vila Basileia',
    2
),
(
    'Roberto Carlos Mendes',
    '11911110002',
    '11988880002',
    'roberto.mendes@gmail.com',
    'Rua Coronel João da Silva Feijó, 88 - Parque Mandaqui',
    2
),
(
    'Juliana Ferreira Lima',
    '11911110003',
    '11988880003',
    'juliana.lima@gmail.com',
    'Rua Sete de Setembro, 340 - Vila Basileia',
    2
),
(
    'Marcos Paulo Rocha',
    '11911110004',
    '11988880004',
    'marcos.rocha@gmail.com',
    'Rua dos Ipês, 55 - Parque Mandaqui',
    2
),
(
    'Patricia Gomes Alves',
    '11911110005',
    '11988880005',
    'patricia.alves@gmail.com',
    'Av. Central, 900 - Vila Basileia',
    2
),
(
    'Ricardo Martins Oliveira',
    '11911110006',
    '11988880006',
    'ricardo.oliveira@gmail.com',
    'Rua Bela Vista, 210 - Parque Mandaqui',
    2
),
(
    'Fernanda Souza Costa',
    '11911110007',
    '11988880007',
    'fernanda.costa@gmail.com',
    'Rua das Palmeiras, 45 - Vila Basileia',
    2
),
(
    'Gustavo Henrique Silva',
    '11911110008',
    '11988880008',
    'gustavo.silva@gmail.com',
    'Rua das Acácias, 300 - Parque Mandaqui',
    2
),
(
    'Larissa Martins Cardoso',
    '11911110009',
    '11988880009',
    'larissa.cardoso@gmail.com',
    'Rua Aurora, 77 - Vila Basileia',
    2
),
(
    'Thiago Barbosa Santos',
    '11911110010',
    '11988880010',
    'thiago.santos@gmail.com',
    'Rua dos Pinheiros, 150 - Parque Mandaqui',
    2
);


-- =====================================================
-- ALUNOS
-- =====================================================
-- 10 alunos na Creche CEI Vila Basileia (id_escola = 1)
-- 10 alunos na EMEF Comandante Gastão Moutinho (id_escola = 2)
--
-- Responsáveis:
-- id 1 -> alunos 1, 2 (Vila Basileia)
-- id 2 -> alunos 3, 4 (Gastão Moutinho)
-- id 3 -> alunos 5, 6 (Vila Basileia)
-- id 4 -> alunos 7, 8 (Gastão Moutinho)
-- id 5 -> alunos 9, 10 (Vila Basileia)
-- id 6 -> alunos 11, 12 (Gastão Moutinho)
-- id 7 -> alunos 13, 14 (Vila Basileia)
-- id 8 -> alunos 15, 16 (Gastão Moutinho)
-- id 9 -> alunos 17, 18 (Vila Basileia)
-- id 10 -> alunos 19, 20 (Gastão Moutinho)
-- =====================================================

INSERT INTO aluno (
    nome,
    bairro,
    id_escola,
    turno,
    endereco_embarque,
    endereco_desembarque,
    tipo_trajeto,
    foto,
    dia_vencimento,
    id_responsavel,
    id_condutor
) VALUES

-- ========== CRECHE CEI VILA BASILEIA (id_escola = 1) ==========

(
    'Sofia Ferreira',
    'Vila Basileia',
    1,
    'MANHA',
    'Rua Dr. Soares Brandão Filho, 120 - Vila Basileia',
    'Creche CEI Vila Basileia, Rua Dr. Soares Brandão Filho, 40',
    'AMBOS',
    NULL,
    5,
    1,
    1
),
(
    'Davi Ferreira',
    'Vila Basileia',
    1,
    'MANHA',
    'Rua Dr. Soares Brandão Filho, 120 - Vila Basileia',
    NULL,
    'IDA',
    NULL,
    10,
    1,
    1
),
(
    'Miguel Lima',
    'Vila Basileia',
    1,
    'MANHA',
    NULL,
    'Rua Sete de Setembro, 340 - Vila Basileia',
    'VOLTA',
    NULL,
    20,
    3,
    1
),
(
    'Isabela Lima',
    'Vila Basileia',
    1,
    'MANHA',
    'Rua Sete de Setembro, 340 - Vila Basileia',
    'Creche CEI Vila Basileia, Rua Dr. Soares Brandão Filho, 40',
    'AMBOS',
    NULL,
    25,
    3,
    1
),
(
    'Theo Alves',
    'Vila Basileia',
    1,
    'MANHA',
    'Av. Central, 900 - Vila Basileia',
    'Creche CEI Vila Basileia, Rua Dr. Soares Brandão Filho, 40',
    'AMBOS',
    NULL,
    18,
    5,
    1
),
(
    'Helena Alves',
    'Vila Basileia',
    1,
    'TARDE',
    NULL,
    'Av. Central, 900 - Vila Basileia',
    'VOLTA',
    NULL,
    10,
    5,
    1
),
(
    'Gabriel Costa',
    'Vila Basileia',
    1,
    'TARDE',
    'Rua das Palmeiras, 45 - Vila Basileia',
    NULL,
    'IDA',
    NULL,
    12,
    7,
    1
),
(
    'Laura Costa',
    'Vila Basileia',
    1,
    'TARDE',
    'Rua das Palmeiras, 45 - Vila Basileia',
    'Creche CEI Vila Basileia, Rua Dr. Soares Brandão Filho, 40',
    'AMBOS',
    NULL,
    16,
    7,
    1
),
(
    'Enzo Cardoso',
    'Vila Basileia',
    1,
    'TARDE',
    'Rua Aurora, 77 - Vila Basileia',
    NULL,
    'IDA',
    NULL,
    5,
    9,
    1
),
(
    'Yasmin Cardoso',
    'Vila Basileia',
    1,
    'TARDE',
    NULL,
    'Rua Aurora, 77 - Vila Basileia',
    'VOLTA',
    NULL,
    28,
    9,
    1
),

-- ========== EMEF COMANDANTE GASTÃO MOUTINHO (id_escola = 2) ==========

(
    'Pedro Mendes',
    'Parque Mandaqui',
    2,
    'MANHA',
    'Rua Coronel João da Silva Feijó, 88 - Parque Mandaqui',
    NULL,
    'IDA',
    NULL,
    15,
    2,
    1
),
(
    'Laura Mendes',
    'Parque Mandaqui',
    2,
    'MANHA',
    'Rua Coronel João da Silva Feijó, 88 - Parque Mandaqui',
    'EMEF Comandante Gastão Moutinho, Rua Coronel João da Silva Feijó, 40',
    'AMBOS',
    NULL,
    16,
    2,
    1
),
(
    'Arthur Rocha',
    'Parque Mandaqui',
    2,
    'MANHA',
    'Rua dos Ipês, 55 - Parque Mandaqui',
    NULL,
    'IDA',
    NULL,
    8,
    4,
    1
),
(
    'Alice Rocha',
    'Parque Mandaqui',
    2,
    'MANHA',
    NULL,
    'Rua dos Ipês, 55 - Parque Mandaqui',
    'VOLTA',
    NULL,
    20,
    4,
    1
),
(
    'Lucas Oliveira',
    'Parque Mandaqui',
    2,
    'MANHA',
    'Rua Bela Vista, 210 - Parque Mandaqui',
    'EMEF Comandante Gastão Moutinho, Rua Coronel João da Silva Feijó, 40',
    'AMBOS',
    NULL,
    8,
    6,
    1
),
(
    'Manuela Oliveira',
    'Parque Mandaqui',
    2,
    'TARDE',
    'Rua Bela Vista, 210 - Parque Mandaqui',
    NULL,
    'IDA',
    NULL,
    8,
    6,
    1
),
(
    'Bernardo Silva',
    'Parque Mandaqui',
    2,
    'TARDE',
    'Rua das Acácias, 300 - Parque Mandaqui',
    NULL,
    'IDA',
    NULL,
    10,
    8,
    1
),
(
    'Valentina Silva',
    'Parque Mandaqui',
    2,
    'TARDE',
    NULL,
    'Rua das Acácias, 300 - Parque Mandaqui',
    'VOLTA',
    NULL,
    22,
    8,
    1
),
(
    'Heitor Santos',
    'Parque Mandaqui',
    2,
    'TARDE',
    'Rua dos Pinheiros, 150 - Parque Mandaqui',
    'EMEF Comandante Gastão Moutinho, Rua Coronel João da Silva Feijó, 40',
    'AMBOS',
    NULL,
    5,
    10,
    1
),
(
    'Cecília Santos',
    'Parque Mandaqui',
    2,
    'TARDE',
    NULL,
    'Rua dos Pinheiros, 150 - Parque Mandaqui',
    'VOLTA',
    NULL,
    28,
    10,
    1
);


-- =====================================================
-- ITINERÁRIOS
-- =====================================================

-- MANHÃ - IDA
INSERT INTO itinerario_aluno (
    id_aluno,
    id_condutor,
    turno,
    tipo,
    ordem
) VALUES
(4, 1, 'MANHA', 'IDA', 1),
(1, 1, 'MANHA', 'IDA', 2),
(5, 1, 'MANHA', 'IDA', 3),
(2, 1, 'MANHA', 'IDA', 4),
(3, 1, 'MANHA', 'IDA', 5),
(11, 1, 'MANHA', 'IDA', 6),
(12, 1, 'MANHA', 'IDA', 7),
(13, 1, 'MANHA', 'IDA', 8),
(15, 1, 'MANHA', 'IDA', 9);


-- MANHÃ - VOLTA

INSERT INTO itinerario_aluno (
    id_aluno,
    id_condutor,
    turno,
    tipo,
    ordem
) VALUES
(4, 1, 'MANHA', 'VOLTA', 1),
(1, 1, 'MANHA', 'VOLTA', 2),
(3, 1, 'MANHA', 'VOLTA', 3),
(5, 1, 'MANHA', 'VOLTA', 4),
(12, 1, 'MANHA', 'VOLTA', 5),
(14, 1, 'MANHA', 'VOLTA', 6),
(15, 1, 'MANHA', 'VOLTA', 7);


-- TARDE - IDA

INSERT INTO itinerario_aluno (
    id_aluno,
    id_condutor,
    turno,
    tipo,
    ordem
) VALUES
(7, 1, 'TARDE', 'IDA', 1),
(9, 1, 'TARDE', 'IDA', 2),
(8, 1, 'TARDE', 'IDA', 3),
(16, 1, 'TARDE', 'IDA', 4),
(17, 1, 'TARDE', 'IDA', 5),
(19, 1, 'TARDE', 'IDA', 6);


-- TARDE - VOLTA

INSERT INTO itinerario_aluno (
    id_aluno,
    id_condutor,
    turno,
    tipo,
    ordem
) VALUES
(6, 1, 'TARDE', 'VOLTA', 1),
(10, 1, 'TARDE', 'VOLTA', 2),
(8, 1, 'TARDE', 'VOLTA', 3),
(18, 1, 'TARDE', 'VOLTA', 4),
(20, 1, 'TARDE', 'VOLTA', 5);


-- =====================================================
-- PRESENÇA
-- =====================================================

-- MANHÃ - IDA (2026-09-12)

INSERT INTO presenca (
    id_aluno,
    data,
    turno,
    tipo,
    status
) VALUES
(4, '2026-09-12', 'MANHA', 'IDA', 'PRESENTE'),
(1, '2026-09-12', 'MANHA', 'IDA', 'PRESENTE'),
(5, '2026-09-12', 'MANHA', 'IDA', 'PRESENTE'),
(2, '2026-09-12', 'MANHA', 'IDA', 'AUSENTE'),
(3, '2026-09-12', 'MANHA', 'IDA', 'PRESENTE'),
(11, '2026-09-12', 'MANHA', 'IDA', 'PRESENTE'),
(12, '2026-09-12', 'MANHA', 'IDA', 'PRESENTE'),
(13, '2026-09-12', 'MANHA', 'IDA', 'AUSENTE'),
(15, '2026-09-12', 'MANHA', 'IDA', 'PRESENTE');


-- TARDE - IDA (2026-09-12)

INSERT INTO presenca (
    id_aluno,
    data,
    turno,
    tipo,
    status
) VALUES
(7, '2026-09-12', 'TARDE', 'IDA', 'PRESENTE'),
(9, '2026-09-12', 'TARDE', 'IDA', 'AUSENTE'),
(8, '2026-09-12', 'TARDE', 'IDA', 'PRESENTE'),
(16, '2026-09-12', 'TARDE', 'IDA', 'PRESENTE'),
(17, '2026-09-12', 'TARDE', 'IDA', 'PRESENTE'),
(19, '2026-09-12', 'TARDE', 'IDA', 'AUSENTE');


-- TARDE - VOLTA (2026-09-12)

INSERT INTO presenca (
    id_aluno,
    data,
    turno,
    tipo,
    status
) VALUES
(6, '2026-09-12', 'TARDE', 'VOLTA', 'PRESENTE'),
(10, '2026-09-12', 'TARDE', 'VOLTA', 'AUSENTE'),
(8, '2026-09-12', 'TARDE', 'VOLTA', 'PRESENTE'),
(18, '2026-09-12', 'TARDE', 'VOLTA', 'PRESENTE'),
(20, '2026-09-12', 'TARDE', 'VOLTA', 'PRESENTE');


-- TESTE CRÍTICO:
-- MESMO ALUNO + MESMA DATA + TURNOS DIFERENTES

INSERT INTO presenca (
    id_aluno,
    data,
    turno,
    tipo,
    status
) VALUES
(1, '2026-09-12', 'TARDE', 'IDA', 'PRESENTE');


-- OUTRA DATA (2026-09-10)

INSERT INTO presenca (
    id_aluno,
    data,
    turno,
    tipo,
    status
) VALUES
(4, '2026-09-10', 'MANHA', 'IDA', 'PRESENTE'),
(1, '2026-09-10', 'MANHA', 'IDA', 'AUSENTE'),
(5, '2026-09-10', 'MANHA', 'IDA', 'PRESENTE'),
(11, '2026-09-10', 'MANHA', 'IDA', 'PRESENTE'),
(7, '2026-09-10', 'TARDE', 'IDA', 'PRESENTE'),
(9, '2026-09-10', 'TARDE', 'IDA', 'AUSENTE'),
(16, '2026-09-10', 'TARDE', 'IDA', 'PRESENTE');


-- =====================================================
-- MENSALIDADES
-- (1 mensalidade por aluno - referência 2026-09)
-- =====================================================

INSERT INTO mensalidade (
    id_aluno,
    valor,
    data_vencimento,
    data_pagamento,
    status,
    id_condutor,
    mes_referencia
) VALUES
(1,  480.00, '2026-09-05', NULL,         'ATRASADO', 1, '2026-09'),
(2,  460.00, '2026-09-10', '2026-09-08', 'PAGO',     1, '2026-09'),
(3,  450.00, '2026-09-10', NULL,         'ATRASADO', 1, '2026-09'),
(4,  520.00, '2026-09-12', '2026-09-11', 'PAGO',     1, '2026-09'),
(5,  500.00, '2026-09-12', NULL,         'ATRASADO', 1, '2026-09'),
(6,  470.00, '2026-09-14', NULL,         'PENDENTE', 1, '2026-09'),
(7,  550.00, '2026-09-13', '2026-09-13', 'PAGO',     1, '2026-09'),
(8,  450.00, '2026-09-10', NULL,         'ATRASADO', 1, '2026-09'),
(9,  500.00, '2026-09-12', '2026-09-11', 'PAGO',     1, '2026-09'),
(10, 600.00, '2026-09-14', NULL,         'PENDENTE', 1, '2026-09'),
(11, 470.00, '2026-09-15', NULL,         'PENDENTE', 1, '2026-09'),
(12, 430.00, '2026-09-20', NULL,         'PENDENTE', 1, '2026-09'),
(13, 620.00, '2026-09-25', NULL,         'PENDENTE', 1, '2026-09'),
(14, 480.00, '2026-09-05', '2026-09-04', 'PAGO',     1, '2026-09'),
(15, 490.00, '2026-09-08', NULL,         'ATRASADO', 1, '2026-09'),
(16, 510.00, '2026-09-10', '2026-09-09', 'PAGO',     1, '2026-09'),
(17, 460.00, '2026-09-12', NULL,         'PENDENTE', 1, '2026-09'),
(18, 530.00, '2026-09-15', NULL,         'PENDENTE', 1, '2026-09'),
(19, 480.00, '2026-09-18', NULL,         'PENDENTE', 1, '2026-09'),
(20, 540.00, '2026-09-20', NULL,         'PENDENTE', 1, '2026-09');


-- =====================================================
-- ORÇAMENTOS
-- =====================================================

INSERT INTO orcamento (
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
    id_condutor
) VALUES
(
    'Camila Rodrigues Teixeira',
    '(11) 92222-1001',
    'Vila Basileia',
    'Creche CEI Vila Basileia',
    'MANHA',
    1,
    'AMBOS',
    'Rua Barão do Rio Branco, 210 - Vila Basileia',
    'Creche CEI Vila Basileia, Rua Dr. Soares Brandão Filho, 40',
    520.00,
    'PENDENTE',
    FALSE,
    '2026-09-10',
    1
),
(
    'Fabio Henrique Nogueira',
    '(11) 92222-1002',
    'Parque Mandaqui',
    'EMEF Comandante Gastão Moutinho',
    'TARDE',
    2,
    'IDA',
    'Rua Aurora, 77 - Parque Mandaqui',
    NULL,
    850.00,
    'PENDENTE',
    FALSE,
    '2026-09-11',
    1
),
(
    'Larissa Martins Cardoso',
    '(11) 92222-1003',
    'Vila Basileia',
    'Creche CEI Vila Basileia',
    'TARDE',
    1,
    'VOLTA',
    NULL,
    'Rua Vila Nova, 300 - Vila Basileia',
    480.00,
    'EM_CADASTRO',
    FALSE,
    '2026-09-12',
    1
);


-- =====================================================
-- DOCUMENTOS
-- =====================================================

INSERT INTO documento (
    tipo_documento,
    data_emissao,
    data_validade,
    status,
    id_condutor
) VALUES
(
    'CNH',
    '2021-06-15',
    '2031-06-15',
    'VALIDO',
    1
),
(
    'CRLV Perua',
    '2026-08-20',
    '2027-08-20',
    'VALIDO',
    1
),
(
    'Vistoria Inspeção DETRAN',
    '2026-06-01',
    '2026-09-01',
    'VENCIDO',
    1
);


-- =====================================================
-- DESPESAS
-- =====================================================

INSERT INTO despesa (
    tipo,
    descricao,
    valor,
    data,
    id_condutor
) VALUES
(
    'Combustível',
    'Abastecimento do veículo escolar - agosto/2026',
    850.00,
    '2026-09-03',
    1
),
(
    'Manutenção',
    'Troca de óleo e revisão preventiva',
    420.00,
    '2026-09-06',
    1
),
(
    'Seguro do veículo',
    'Parcela mensal do seguro do veículo escolar',
    380.00,
    '2026-09-10',
    1
),
(
    'IPVA',
    'Parcela mensal do IPVA 2026',
    210.00,
    '2026-09-10',
    1
),
(
    'Salário do monitor',
    'Pagamento mensal da monitora EDILEIDE BATISTA',
    1500.00,
    '2026-09-05',
    1
);


-- =====================================================
-- CONSULTAS DE TESTE
-- =====================================================

SELECT * FROM condutor;

SELECT * FROM monitor;

SELECT * FROM responsavel;

SELECT * FROM escola;

SELECT * FROM aluno;

SELECT *
FROM itinerario_aluno
ORDER BY turno, tipo, ordem;

SELECT *
FROM presenca
ORDER BY data, turno, id_aluno;

SELECT * FROM mensalidade;

SELECT * FROM orcamento;

SELECT * FROM documento;

SELECT * FROM notificacao;

SELECT * FROM despesa;


-- =====================================================
-- TESTE DA LINHA DE TRAJETO
-- =====================================================

SELECT
    p.data,
    p.turno,
    a.id_aluno,
    a.nome,
    a.id_escola,
    e.nome AS escola,
    ia.tipo,
    ia.ordem,
    p.status
FROM presenca p
INNER JOIN aluno a
    ON a.id_aluno = p.id_aluno
INNER JOIN escola e
    ON e.id_escola = a.id_escola
INNER JOIN itinerario_aluno ia
    ON ia.id_aluno = p.id_aluno
    AND ia.turno = p.turno
INNER JOIN (
    SELECT
        id_aluno,
        turno,
        MIN(id_itinerario) AS id_itinerario
    FROM itinerario_aluno
    GROUP BY id_aluno, turno
) primeira_rota
    ON primeira_rota.id_itinerario = ia.id_itinerario
WHERE
    p.data = '2026-09-12'
    AND p.turno = 'MANHA'
    AND p.status = 'PRESENTE'
ORDER BY
    ia.ordem ASC;


-- =====================================================
-- TESTE DA SEPARAÇÃO DE TURNOS DA PRESENÇA
-- =====================================================

SELECT
    id_aluno,
    data,
    turno,
    status
FROM presenca
WHERE
    id_aluno = 1
    AND data = '2026-09-12'
ORDER BY turno;


-- =====================================================
-- FIM DO SCHEMA + SEED
-- =====================================================