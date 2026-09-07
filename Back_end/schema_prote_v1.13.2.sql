-- =====================================================
-- SCHEMA PROTE ADM - v1.13
-- =====================================================
-- Estrutura completa + seed de testes
--
-- Alterações da v1.13:
-- 1) Adicionada tabela de notificações.
-- 2) Notificações vinculadas ao condutor responsável.
-- 3) Suporte a notificações lidas e resolvidas.
-- 4) Suporte a vínculo da notificação com registros
--    específicos do sistema.
--
-- v1.12:
-- 1) presenca.turno diferencia MANHA, TARDE e NOITE.
-- 2) presença é única por id_aluno + data + turno.
-- 3) não há migração de registros antigos sem turno.
--
-- Seed incluída:
-- - 1 condutor
-- - 2 monitores
-- - 3 escolas
-- - 6 responsáveis
-- - 13 alunos
-- - itinerários de MANHA e TARDE
-- - presenças de MANHA e TARDE
-- - teste do mesmo aluno em dois turnos no mesmo dia
-- - mensalidades
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
    email VARCHAR(100),
    endereco VARCHAR(255) NOT NULL,
    quantidade_alunos INT NOT NULL DEFAULT 1,

    CONSTRAINT chk_responsavel_quantidade_alunos
        CHECK (quantidade_alunos >= 1)
);


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
    observacao TEXT,

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
    escolas,
    foto,
    ativo
) VALUES (
    'Carlos Eduardo Lima',
    'liametechnologies@gmail.com',
    '$2a$10$S4T6MlgCnSowCx9Vz4X4xeAsO4.G8U5RjnxczS70C/qbni4Q1uDzi',
    '(11) 98888-1234',
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
    'Fernanda Oliveira Souza',
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
    'Colégio Estrela do Saber',
    'Rua das Acácias, 450 - Centro'
),
(
    'Escola Nova Geração',
    'Av. Brasil, 1200 - Jardim das Flores'
),
(
    'Colégio Caminhos do Futuro',
    'Rua das Palmeiras, 800 - Vila Nova'
);


-- =====================================================
-- RESPONSÁVEIS
-- =====================================================

INSERT INTO responsavel (
    nome,
    telefone,
    email,
    endereco,
    quantidade_alunos
) VALUES
(
    'Ana Beatriz Souza',
    '(11) 91111-0001',
    'ana.souza@gmail.com',
    'Rua das Palmeiras, 120 - Centro',
    3
),
(
    'Roberto Carlos Mendes',
    '(11) 91111-0002',
    'roberto.mendes@gmail.com',
    'Av. das Laranjeiras, 88 - Jardim Europa',
    2
),
(
    'Juliana Ferreira Lima',
    '(11) 91111-0003',
    'juliana.lima@gmail.com',
    'Rua Sete de Setembro, 340 - Centro',
    3
),
(
    'Marcos Paulo Rocha',
    '(11) 91111-0004',
    'marcos.rocha@gmail.com',
    'Rua dos Ipês, 55 - Vila Nova',
    2
),
(
    'Patricia Gomes Alves',
    '(11) 91111-0005',
    'patricia.alves@gmail.com',
    'Av. Central, 900 - Jardim das Flores',
    3
),
(
    'Ricardo Martins Oliveira',
    '(11) 91111-0006',
    'ricardo.oliveira@gmail.com',
    'Rua Bela Vista, 210 - Centro',
    2
);


-- =====================================================
-- ALUNOS
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

-- MANHÃ

(
    'Sofia Souza',
    'Centro',
    1,
    'MANHA',
    'Rua das Palmeiras, 120 - Centro',
    'Colégio Estrela do Saber, Rua das Acácias, 450',
    'AMBOS',
    NULL,
    5,
    1,
    1
),
(
    'Davi Souza',
    'Centro',
    1,
    'MANHA',
    'Rua das Palmeiras, 120 - Centro',
    NULL,
    'IDA',
    NULL,
    10,
    1,
    1
),
(
    'Miguel Lima',
    'Centro',
    1,
    'MANHA',
    NULL,
    'Rua Sete de Setembro, 340 - Centro',
    'VOLTA',
    NULL,
    20,
    3,
    1
),
(
    'Isabela Lima',
    'Centro',
    1,
    'MANHA',
    'Rua Sete de Setembro, 340 - Centro',
    'Colégio Estrela do Saber, Rua das Acácias, 450',
    'AMBOS',
    NULL,
    25,
    3,
    1
),
(
    'Gabriel Rocha',
    'Vila Nova',
    2,
    'MANHA',
    'Rua dos Ipês, 55 - Vila Nova',
    NULL,
    'IDA',
    NULL,
    12,
    4,
    1
),
(
    'Theo Alves',
    'Jardim das Flores',
    1,
    'MANHA',
    'Av. Central, 900 - Jardim das Flores',
    'Colégio Estrela do Saber, Rua das Acácias, 450',
    'AMBOS',
    NULL,
    18,
    5,
    1
),
(
    'Lucas Oliveira',
    'Centro',
    3,
    'MANHA',
    'Rua Bela Vista, 210 - Centro',
    NULL,
    'IDA',
    NULL,
    8,
    6,
    1
),

-- TARDE

(
    'Helena Souza',
    'Centro',
    1,
    'TARDE',
    NULL,
    'Rua das Palmeiras, 120 - Centro',
    'VOLTA',
    NULL,
    10,
    1,
    1
),
(
    'Pedro Mendes',
    'Jardim Europa',
    2,
    'TARDE',
    'Av. das Laranjeiras, 88 - Jardim Europa',
    NULL,
    'IDA',
    NULL,
    15,
    2,
    1
),
(
    'Laura Mendes',
    'Jardim Europa',
    2,
    'TARDE',
    'Av. das Laranjeiras, 88 - Jardim Europa',
    'Escola Nova Geração, Av. Brasil, 1200',
    'AMBOS',
    NULL,
    16,
    2,
    1
),
(
    'Enzo Lima',
    'Centro',
    2,
    'TARDE',
    'Rua Sete de Setembro, 340 - Centro',
    NULL,
    'IDA',
    NULL,
    5,
    3,
    1
),
(
    'Yasmin Alves',
    'Jardim das Flores',
    1,
    'TARDE',
    NULL,
    'Av. Central, 900 - Jardim das Flores',
    'VOLTA',
    NULL,
    28,
    5,
    1
),
(
    'Arthur Oliveira',
    'Centro',
    3,
    'TARDE',
    'Rua Bela Vista, 210 - Centro',
    'Colégio Caminhos do Futuro, Rua das Palmeiras, 800',
    'AMBOS',
    NULL,
    8,
    6,
    1
);


-- =====================================================
-- ITINERÁRIOS
-- =====================================================

INSERT INTO itinerario_aluno (
    id_aluno,
    id_condutor,
    turno,
    tipo,
    ordem
) VALUES
(4, 1, 'MANHA', 'IDA', 1),
(1, 1, 'MANHA', 'IDA', 2),
(7, 1, 'MANHA', 'IDA', 3),
(6, 1, 'MANHA', 'IDA', 4),
(2, 1, 'MANHA', 'IDA', 5),
(5, 1, 'MANHA', 'IDA', 6);


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
(6, 1, 'MANHA', 'VOLTA', 4);


-- TARDE - IDA

INSERT INTO itinerario_aluno (
    id_aluno,
    id_condutor,
    turno,
    tipo,
    ordem
) VALUES
(10, 1, 'TARDE', 'IDA', 1),
(13, 1, 'TARDE', 'IDA', 2),
(9, 1, 'TARDE', 'IDA', 3),
(11, 1, 'TARDE', 'IDA', 4);


-- TARDE - VOLTA

INSERT INTO itinerario_aluno (
    id_aluno,
    id_condutor,
    turno,
    tipo,
    ordem
) VALUES
(10, 1, 'TARDE', 'VOLTA', 1),
(12, 1, 'TARDE', 'VOLTA', 2),
(13, 1, 'TARDE', 'VOLTA', 3),
(8, 1, 'TARDE', 'VOLTA', 4);


-- =====================================================
-- PRESENÇA
-- =====================================================

INSERT INTO presenca (
    id_aluno,
    data,
    turno,
    tipo,
    status
) VALUES
(4, '2026-08-31', 'MANHA', 'IDA', 'PRESENTE'),
(1, '2026-08-31', 'MANHA', 'IDA', 'PRESENTE'),
(7, '2026-08-31', 'MANHA', 'IDA', 'AUSENTE'),
(6, '2026-08-31', 'MANHA', 'IDA', 'PRESENTE'),
(2, '2026-08-31', 'MANHA', 'IDA', 'AUSENTE'),
(5, '2026-08-31', 'MANHA', 'IDA', 'PRESENTE');


-- TARDE
-- Repare nos alunos 10 e 13: cada um aparece nas DUAS chamadas da
-- tarde (IDA e VOLTA, conforme o itinerário misto acima) e cada
-- chamada tem seu próprio status independente — é exatamente o caso
-- que a Linha de Trajeto precisa tratar entrada a entrada.

INSERT INTO presenca (
    id_aluno,
    data,
    turno,
    tipo,
    status,
    observacao
) VALUES
(10, '2026-08-31', 'TARDE', 'IDA', 'PRESENTE', NULL),
(10, '2026-08-31', 'TARDE', 'VOLTA', 'AUSENTE', 'Não volta com a gente hoje porque o pai buscou.'),
(13, '2026-08-31', 'TARDE', 'IDA', 'AUSENTE', 'Falta médica, atestado entregue.'),
(13, '2026-08-31', 'TARDE', 'VOLTA', 'PRESENTE', NULL),
(9, '2026-08-31', 'TARDE', 'IDA', 'PRESENTE', NULL),
(11, '2026-08-31', 'TARDE', 'IDA', 'PRESENTE', NULL),
(12, '2026-08-31', 'TARDE', 'VOLTA', 'AUSENTE', 'Foi buscado pela mãe na escola.'),
(8, '2026-08-31', 'TARDE', 'VOLTA', 'PRESENTE', NULL);


-- TESTE CRÍTICO:
-- MESMO ALUNO + MESMA DATA + TURNOS DIFERENTES

INSERT INTO presenca (
    id_aluno,
    data,
    turno,
    tipo,
    status
) VALUES
(1, '2026-08-31', 'TARDE', 'VOLTA', 'PRESENTE');


-- OUTRA DATA

INSERT INTO presenca (
    id_aluno,
    data,
    turno,
    tipo,
    status
) VALUES
(4, '2026-08-29', 'MANHA', 'IDA', 'PRESENTE'),
(1, '2026-08-29', 'MANHA', 'IDA', 'AUSENTE'),
(7, '2026-08-29', 'MANHA', 'IDA', 'PRESENTE'),
(10, '2026-08-29', 'TARDE', 'IDA', 'PRESENTE'),
(9, '2026-08-29', 'TARDE', 'IDA', 'AUSENTE');


-- =====================================================
-- MENSALIDADES
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
(1, 480.00, '2026-08-05', NULL,         'ATRASADO', 1, '2026-08'),
(2, 460.00, '2026-08-10', '2026-08-08', 'PAGO',     1, '2026-08'),
(3, 450.00, '2026-08-10', NULL,         'ATRASADO', 1, '2026-08'),
(4, 520.00, '2026-08-12', '2026-08-11', 'PAGO',     1, '2026-08'),
(5, 500.00, '2026-08-15', NULL,         'ATRASADO', 1, '2026-08'),
(6, 470.00, '2026-08-18', NULL,         'PENDENTE', 1, '2026-08'),
(7, 550.00, '2026-08-20', '2026-08-19', 'PAGO',     1, '2026-08'),
(8, 450.00, '2026-08-10', NULL,         'ATRASADO', 1, '2026-08'),
(9, 500.00, '2026-08-15', '2026-08-14', 'PAGO',     1, '2026-08'),
(10, 600.00, '2026-08-16', NULL,         'ATRASADO', 1, '2026-08'),
(11, 470.00, '2026-08-20', NULL,         'PENDENTE', 1, '2026-08'),
(12, 430.00, '2026-08-25', NULL,         'PENDENTE', 1, '2026-08'),
(13, 620.00, '2026-08-28', NULL,         'PENDENTE', 1, '2026-08');


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
    'Centro',
    'Colégio Estrela do Saber',
    'MANHA',
    1,
    'AMBOS',
    'Rua Barão do Rio Branco, 210 - Centro',
    'Colégio Estrela do Saber, Rua das Acácias, 450',
    520.00,
    'PENDENTE',
    FALSE,
    '2026-08-20',
    1
),
(
    'Fabio Henrique Nogueira',
    '(11) 92222-1002',
    'Jardim das Flores',
    'Escola Nova Geração',
    'TARDE',
    2,
    'IDA',
    'Rua Aurora, 77 - Jardim das Flores',
    NULL,
    850.00,
    'PENDENTE',
    FALSE,
    '2026-08-21',
    1
),
(
    'Larissa Martins Cardoso',
    '(11) 92222-1003',
    'Vila Nova',
    'Escola Nova Geração',
    'TARDE',
    1,
    'VOLTA',
    NULL,
    'Rua Vila Nova, 300 - Vila Nova',
    480.00,
    'EM_CADASTRO',
    FALSE,
    '2026-08-22',
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
    '2025-08-20',
    '2026-08-20',
    'VALIDO',
    1
),
(
    'Vistoria Inspeção DETRAN',
    '2025-07-01',
    '2026-07-01',
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
    '2026-08-03',
    1
),
(
    'Manutenção',
    'Troca de óleo e revisão preventiva',
    420.00,
    '2026-08-06',
    1
),
(
    'Seguro do veículo',
    'Parcela mensal do seguro do veículo escolar',
    380.00,
    '2026-08-10',
    1
),
(
    'IPVA',
    'Parcela mensal do IPVA 2026',
    210.00,
    '2026-08-10',
    1
),
(
    'Salário do monitor',
    'Pagamento mensal da monitora Fernanda Oliveira Souza',
    1500.00,
    '2026-08-05',
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

-- Esta consulta reproduz o que service_linha_trajeto.ts faz: parte do
-- Itinerário (ordem física, podendo misturar IDA e VOLTA) e busca a
-- presença de cada entrada por aluno + data + turno + tipo. Sem
-- registro de presença, COALESCE assume PRESENTE por padrão.

SELECT
    ia.ordem,
    a.id_aluno,
    a.nome,
    e.nome AS escola,
    ia.tipo,
    COALESCE(p.status, 'PRESENTE') AS status
FROM itinerario_aluno ia
INNER JOIN aluno a
    ON a.id_aluno = ia.id_aluno
INNER JOIN escola e
    ON e.id_escola = a.id_escola
LEFT JOIN presenca p
    ON p.id_aluno = ia.id_aluno
    AND p.data = '2026-08-31'
    AND p.turno = ia.turno
    AND p.tipo = ia.tipo
WHERE
    ia.turno = 'TARDE'
ORDER BY
    ia.ordem ASC;


-- =====================================================
-- TESTE DA SEPARAÇÃO DE TURNO + TIPO DA PRESENÇA
-- =====================================================
-- Mostra o mesmo aluno com registros independentes de IDA e VOLTA no
-- mesmo turno (aluno 10, tarde de 2026-08-31: presente na ida, ausente
-- na volta).

SELECT
    id_aluno,
    data,
    turno,
    tipo,
    status,
    observacao
FROM presenca
WHERE
    id_aluno = 10
    AND data = '2026-08-31'
ORDER BY turno, tipo;


-- =====================================================
-- FIM DO SCHEMA + SEED
-- =====================================================