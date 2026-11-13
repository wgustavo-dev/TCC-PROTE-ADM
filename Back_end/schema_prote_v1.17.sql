-- =====================================================
-- SCHEMA PROTE ADM - v1.17
-- =====================================================
-- Estrutura completa + seed atualizado de outubro/2026
--
-- Alterações da v1.17:
-- 1) Seed de alunos agora define tipo_trajeto (IDA, VOLTA ou AMBOS)
--    de forma aleatória para todos os alunos.
-- 2) Mensalidades com status PAGO agora têm data_pagamento fictícia
--    (0 a 5 dias antes do vencimento). ATRASADO permanece NULL.
--
-- Alterações da v1.16:
-- 1) Seed de alunos agora define o turno de todos os alunos:
--    - Creche Basileia: todos os alunos no turno MANHA.
--    - Escola Gastão Montinho: metade MANHA (21 alunos) e
--      metade TARDE (21 alunos). Irmãos ficam no mesmo turno.
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
-- - 1 escola utilizada pelos alunos
-- - 10 responsáveis, 10 alunos e 10 mensalidades
-- - tabela itinerario_aluno removida
-- - presenca mantida vazia, sem registros antigos
-- - mensalidades somente de outubro/2026
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


-- TABELA itinerario_aluno removida conforme solicitado. O schema não possuía tabela separada chamada rota.

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


-- ESCOLAS
INSERT INTO escola (nome, endereco) VALUES

('Creche Basileia', 'Rua Dr. Soares Brandão Filho, 40 - Vila Basileia');

-- RESPONSÁVEIS. Telefones e endereços fictícios para campos obrigatórios ausentes nas fontes.
INSERT INTO responsavel (nome, telefone, telefone_emergencia, email, endereco, quantidade_alunos) VALUES
('Thayanara Silva', '11956883159', '11983377828', NULL, 'Rua Francisco Arcuri, 444 - Pedra Branca', 1),
('Camilla Rodrigues', '11906204001', '11901435385', NULL, 'Rua Irmão João Creff, 311 - Vila Aurora', 1),
('Marco Aurélio', '11943859527', '11978000487', NULL, 'Rua João de Laet, 114 - Vila Aurora', 1),
('Larissa M', '11941293894', '11918464731', NULL, 'Rua Apetumbi, 301 - Horto Florestal', 1),
('Lilian Almeida', '11994936219', '11957841465', NULL, 'Rua Wanda Martin, 306 - Vila Amélia', 1),
('Mãe de Bryant e Maytê', '11956003813', '11953149505', NULL, 'Rua Wanda Martin, 130 - Vila Amélia', 1),
('Mãe do Mateo', '11959341220', '11983390680', NULL, 'Rua Lacerda Marques, 477 - Lauzane Paulista', 1),
('Pamela Lima M', '11938338945', '11947683474', NULL, 'Rua Antônio Gomes da Silva, 159 - Horto Florestal', 1),
('Ana Carolina', '11968482479', '11933547417', NULL, 'Rua José Ferreira de Castro, 210 - Vila Amélia', 1),
('Natalia C', '11936002925', '11938027645', NULL, 'Rua Laudelino Bicudo, 161 - Lauzane Paulista', 1);

-- ALUNOS DE EXEMPLO. IDs de responsável e condutor preservam os vínculos.
-- Dados de endereço não fornecidos foram deixados NULL.
INSERT INTO aluno (nome, bairro, id_escola, turno, endereco_embarque, endereco_desembarque, tipo_trajeto, foto, dia_vencimento, necessidade_acessibilidade_temporaria, necessidade_acessibilidade_permanente, observacao_acessibilidade, id_responsavel, id_condutor) VALUES
('Emanuele', 'Pedra Branca', 1, 'MANHA', 'Rua Francisco Arcuri, 444 - Pedra Branca', 'Rua Francisco Arcuri, 444 - Pedra Branca', 'IDA', NULL, 2, FALSE, FALSE, NULL, 1, 1),
('Leo Rodrigues Novais', 'Vila Aurora', 1, 'MANHA', 'Rua Irmão João Creff, 311 - Vila Aurora', 'Rua Irmão João Creff, 311 - Vila Aurora', 'VOLTA', NULL, 4, FALSE, FALSE, NULL, 2, 1),
('Caio', 'Vila Aurora', 1, 'MANHA', 'Rua João de Laet, 114 - Vila Aurora', 'Rua João de Laet, 114 - Vila Aurora', 'AMBOS', NULL, 4, FALSE, FALSE, NULL, 3, 1),
('José Davi', 'Horto Florestal', 1, 'MANHA', 'Rua Apetumbi, 301 - Horto Florestal', 'Rua Apetumbi, 301 - Horto Florestal', 'AMBOS', NULL, 5, FALSE, FALSE, NULL, 4, 1),
('Manu Lacerda', 'Vila Amélia', 1, 'MANHA', 'Rua Wanda Martin, 306 - Vila Amélia', 'Rua Wanda Martin, 306 - Vila Amélia', 'AMBOS', NULL, 6, FALSE, FALSE, NULL, 5, 1),
('Mayte', 'Vila Amélia', 1, 'MANHA', 'Rua Wanda Martin, 130 - Vila Amélia', 'Rua Wanda Martin, 130 - Vila Amélia', 'IDA', NULL, 6, FALSE, FALSE, NULL, 6, 1),
('Mateo', 'Lauzane Paulista', 1, 'MANHA', 'Rua Lacerda Marques, 477 - Lauzane Paulista', 'Rua Lacerda Marques, 477 - Lauzane Paulista', 'AMBOS', NULL, 6, FALSE, FALSE, NULL, 7, 1),
('Marina', 'Horto Florestal', 1, 'MANHA', 'Rua Antônio Gomes da Silva, 159 - Horto Florestal', 'Rua Antônio Gomes da Silva, 159 - Horto Florestal', 'AMBOS', NULL, 6, FALSE, FALSE, NULL, 8, 1),
('Lavinia', 'Vila Amélia', 1, 'MANHA', 'Rua José Ferreira de Castro, 210 - Vila Amélia', 'Rua José Ferreira de Castro, 210 - Vila Amélia', 'VOLTA', NULL, 7, FALSE, FALSE, NULL, 9, 1),
('Levi', 'Lauzane Paulista', 1, 'MANHA', 'Rua Laudelino Bicudo, 161 - Lauzane Paulista', 'Rua Laudelino Bicudo, 161 - Lauzane Paulista', 'AMBOS', NULL, 9, FALSE, FALSE, NULL, 10, 1);

-- PRESENÇA: tabela mantida vazia; todos os registros antigos foram descartados.

-- SOMENTE MENSALIDADES DE OUTUBRO/2026. Não há mensalidades de setembro.
-- Datas de pagamento FICTÍCIAS: mensalidades PAGO recebem data entre 0 e 5 dias antes do vencimento
-- (nunca antes de 01/10/2026). Mensalidades ATRASADO permanecem com data_pagamento NULL.
INSERT INTO mensalidade (id_aluno, valor, data_vencimento, data_pagamento, status, id_condutor, mes_referencia) VALUES
(1, 230.00, '2026-10-02', '2026-10-01', 'PAGO', 1, '2026-10'),
(2, 235.00, '2026-10-04', '2026-10-04', 'PAGO', 1, '2026-10'),
(3, 225.00, '2026-10-04', '2026-10-01', 'PAGO', 1, '2026-10'),
(4, 200.00, '2026-10-05', '2026-10-05', 'PAGO', 1, '2026-10'),
(5, 230.00, '2026-10-06', '2026-10-01', 'PAGO', 1, '2026-10'),
(6, 180.00, '2026-10-06', '2026-10-06', 'PAGO', 1, '2026-10'),
(7, 170.00, '2026-10-06', '2026-10-02', 'PAGO', 1, '2026-10'),
(8, 135.00, '2026-10-06', '2026-10-01', 'PAGO', 1, '2026-10'),
(9, 220.00, '2026-10-07', '2026-10-06', 'PAGO', 1, '2026-10'),
(10, 210.00, '2026-10-09', '2026-10-05', 'PAGO', 1, '2026-10');

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
-- FIM DO SCHEMA + SEED
-- =====================================================
-- CONFERÊNCIA DO CADASTRO NOVO
SELECT e.nome, COUNT(a.id_aluno) AS total_alunos FROM escola e LEFT JOIN aluno a ON a.id_escola=e.id_escola GROUP BY e.id_escola,e.nome;
SELECT status, COUNT(*) AS quantidade FROM mensalidade WHERE mes_referencia='2026-10' GROUP BY status;
-- CONFERÊNCIA DOS TURNOS (v1.16)
SELECT e.nome AS escola, a.turno, COUNT(*) AS total_alunos FROM aluno a JOIN escola e ON e.id_escola=a.id_escola GROUP BY e.nome, a.turno ORDER BY e.nome, a.turno;
-- CONFERÊNCIA DOS TRAJETOS (v1.17)
SELECT tipo_trajeto, COUNT(*) AS total_alunos FROM aluno GROUP BY tipo_trajeto;