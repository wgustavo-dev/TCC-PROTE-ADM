-- =====================================================
-- SCHEMA PROTE ADM - v1.12
-- =====================================================
-- ALTERAÇÕES NESTA VERSÃO EM RELAÇÃO À v1.11:
--
-- 1) presenca.turno (NOVO)
--    - Diferencia as chamadas de MANHA, TARDE e NOITE.
--    - A identificação lógica de uma presença passa a considerar
--      id_aluno + data + turno.
--    - Permite que o mesmo aluno tenha registros de presença em
--      turnos diferentes no mesmo dia.
--
-- 2) Restrição UNIQUE em presenca
--    - Impede mais de um registro para o mesmo aluno, data e turno.
--
-- 3) Não há migração de dados antigos neste schema.
--    - Conforme definido para esta versão, não é necessário preservar
--      registros antigos de presença sem turno.
--
-- =====================================================
-- HISTÓRICO
-- =====================================================
-- As alterações das versões anteriores permanecem incorporadas
-- à estrutura abaixo.
--
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
    dia_vencimento TINYINT,

    id_responsavel INT NOT NULL,
    id_condutor INT,

    CONSTRAINT chk_aluno_dia_vencimento
    CHECK (dia_vencimento IS NULL OR (dia_vencimento BETWEEN 1 AND 31)),

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
    turno ENUM('MANHA','TARDE','NOITE') NOT NULL,
    status ENUM('PRESENTE','AUSENTE') NOT NULL,

    UNIQUE KEY uk_presenca_aluno_data_turno (id_aluno, data, turno),

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
    mes_referencia CHAR(7) NOT NULL,

    FOREIGN KEY (id_aluno)
    REFERENCES aluno(id_aluno)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    FOREIGN KEY (id_condutor)
    REFERENCES condutor(id_condutor)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

    -- impede a rotina de renovação mensal gerar duas mensalidades do
    -- mesmo aluno no mesmo mês
    UNIQUE KEY uk_aluno_mes_referencia (id_aluno, mes_referencia)
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
-- =====================================================
-- SEED DE DADOS FICTÍCIOS — PROTE ADM (schema v1.11)

INSERT INTO condutor (nome, email, senha, telefone, escolas, foto, ativo)
VALUES (
  'Carlos Eduardo Lima',
  'liametechnologies@gmail.com',
  '$2a$10$S4T6MlgCnSowCx9Vz4X4xeAsO4.G8U5RjnxczS70C/qbni4Q1uDzi',
  '(11) 98888-1234',
  NULL,
  NULL,
  TRUE
);
-- id_condutor = 1

-- =====================================================
-- MONITOR (login: monitor@gmail.com / Prote1234)
-- =====================================================
INSERT INTO monitor (nome, email, senha, telefone, foto, id_condutor, ativo)
VALUES (
  'Fernanda Oliveira Souza',
  'monitor@gmail.com',
  '$2a$10$S4T6MlgCnSowCx9Vz4X4xeAsO4.G8U5RjnxczS70C/qbni4Q1uDzi',
  '(11) 97777-5678',
  NULL,
  1,
  TRUE
);
-- id_monitor = 1

-- =====================================================
-- ESCOLAS (2)
-- =====================================================
INSERT INTO escola (nome, endereco) VALUES
('Colégio Estrela do Saber', 'Rua das Acácias, 450 - Centro'),
('Escola Nova Geração', 'Av. Brasil, 1200 - Jardim das Flores');
-- id_escola: 1 = Colégio Estrela do Saber | 2 = Escola Nova Geração

-- =====================================================
-- RESPONSÁVEIS (5, com até 3 alunos cada)
-- =====================================================
INSERT INTO responsavel (nome, telefone, email, endereco, quantidade_alunos) VALUES
('Ana Beatriz Souza',   '(11) 91111-0001', 'ana.souza@gmail.com',      'Rua das Palmeiras, 120 - Centro',        3),
('Roberto Carlos Mendes','(11) 91111-0002','roberto.mendes@gmail.com', 'Av. das Laranjeiras, 88 - Jardim Europa', 2),
('Juliana Ferreira Lima','(11) 91111-0003','juliana.lima@gmail.com',   'Rua Sete de Setembro, 340 - Centro',      3),
('Marcos Paulo Rocha',   '(11) 91111-0004','marcos.rocha@gmail.com',   'Rua dos Ipês, 55 - Vila Nova',            1),
('Patricia Gomes Alves', '(11) 91111-0005','patricia.alves@gmail.com', 'Av. Central, 900 - Jardim das Flores',    2);
-- id_responsavel: 1=Ana, 2=Roberto, 3=Juliana, 4=Marcos, 5=Patricia

-- =====================================================
-- ALUNOS (11 no total, distribuídos entre os 5 responsáveis)
-- =====================================================
-- Regra de endereço respeitada: IDA só tem embarque, VOLTA só tem
-- desembarque, AMBOS tem os dois. `dia_vencimento` de cada aluno já
-- sai preenchido com o mesmo dia usado na mensalidade dele lá embaixo.
INSERT INTO aluno
  (nome, bairro, id_escola, turno, endereco_embarque, endereco_desembarque, tipo_trajeto, foto, dia_vencimento, id_responsavel, id_condutor)
VALUES
-- Filhos de Ana Beatriz Souza (responsavel 1)
('Sofia Souza',   'Centro',       1, 'MANHA', 'Rua das Palmeiras, 120 - Centro', 'Colégio Estrela do Saber, Rua das Acácias, 450', 'AMBOS', NULL, 5,  1, 1),
('Davi Souza',    'Centro',       1, 'MANHA', 'Rua das Palmeiras, 120 - Centro', NULL,                                              'IDA',   NULL, 10, 1, 1),
('Helena Souza',  'Centro',       1, 'TARDE', NULL,                              'Rua das Palmeiras, 120 - Centro',                'VOLTA', NULL, 10, 1, 1),

-- Filhos de Roberto Carlos Mendes (responsavel 2)
('Pedro Mendes',  'Jardim Europa',2, 'TARDE', 'Av. das Laranjeiras, 88 - Jardim Europa', NULL,                                      'IDA',   NULL, 15, 2, 1),
('Laura Mendes',  'Jardim Europa',2, 'TARDE', 'Av. das Laranjeiras, 88 - Jardim Europa', 'Escola Nova Geração, Av. Brasil, 1200',   'AMBOS', NULL, 16, 2, 1),

-- Filhos de Juliana Ferreira Lima (responsavel 3)
('Miguel Lima',   'Centro',       1, 'MANHA', NULL,                              'Rua Sete de Setembro, 340 - Centro',             'VOLTA', NULL, 20, 3, 1),
('Isabela Lima',  'Centro',       1, 'MANHA', 'Rua Sete de Setembro, 340 - Centro','Colégio Estrela do Saber, Rua das Acácias, 450','AMBOS', NULL, 25, 3, 1),
('Enzo Lima',     'Centro',       2, 'TARDE', 'Rua Sete de Setembro, 340 - Centro', NULL,                                           'IDA',   NULL, 5,  3, 1),

-- Filho de Marcos Paulo Rocha (responsavel 4)
('Gabriel Rocha', 'Vila Nova',    2, 'MANHA', 'Rua dos Ipês, 55 - Vila Nova',     NULL,                                             'IDA',   NULL, 12, 4, 1),

-- Filhos de Patricia Gomes Alves (responsavel 5)
('Yasmin Alves',  'Jardim das Flores', 1, 'TARDE', NULL,                          'Av. Central, 900 - Jardim das Flores',           'VOLTA', NULL, 28, 5, 1),
('Theo Alves',    'Jardim das Flores', 1, 'MANHA', 'Av. Central, 900 - Jardim das Flores', 'Colégio Estrela do Saber, Rua das Acácias, 450', 'AMBOS', NULL, 18, 5, 1);


-- =====================================================
-- MENSALIDADES 
-- =====================================================

INSERT INTO mensalidade (id_aluno, valor, data_vencimento, data_pagamento, status, id_condutor, mes_referencia) VALUES
-- ATRASADAS 
(1,  480.00, '2026-08-05', NULL,         'ATRASADO', 1, '2026-08'), -- Sofia Souza
(3,  450.00, '2026-08-10', NULL,         'ATRASADO', 1, '2026-08'), -- Helena Souza
(9,  520.00, '2026-08-12', NULL,         'ATRASADO', 1, '2026-08'), -- Gabriel Rocha

-- PAGAS
(2,  460.00, '2026-08-10', '2026-08-08', 'PAGO',     1, '2026-08'), -- Davi Souza
(4,  500.00, '2026-08-15', '2026-08-14', 'PAGO',     1, '2026-08'), -- Pedro Mendes
(8,  470.00, '2026-08-05', '2026-08-05', 'PAGO',     1, '2026-08'), -- Enzo Lima

-- PENDENTES 
(5,  600.00, '2026-08-16', NULL,         'PENDENTE', 1, '2026-08'), -- Laura Mendes (vence hoje)
(6,  450.00, '2026-08-20', NULL,         'PENDENTE', 1, '2026-08'), -- Miguel Lima
(7,  650.00, '2026-08-25', NULL,         'PENDENTE', 1, '2026-08'), -- Isabela Lima
(10, 430.00, '2026-08-28', NULL,         'PENDENTE', 1, '2026-08'), -- Yasmin Alves
(11, 610.00, '2026-08-18', NULL,         'PENDENTE', 1, '2026-08'); -- Theo Alves

-- =====================================================
-- ORÇAMENTOS 
-- =====================================================
INSERT INTO orcamento
  (nome_responsavel, telefone, bairro, escola, turno, quantidade_alunos, tipo_trajeto, endereco_embarque, endereco_desembarque, valor, status, convertido, data_solicitacao, id_condutor)
VALUES
('Camila Rodrigues Teixeira', '(11) 92222-1001', 'Centro',            'Colégio Estrela do Saber', 'MANHA', 1, 'AMBOS', 'Rua Barão do Rio Branco, 210 - Centro',      'Colégio Estrela do Saber, Rua das Acácias, 450', NULL, 'PENDENTE', FALSE, '2026-08-12', 1),
('Fábio Henrique Nogueira',   '(11) 92222-1002', 'Jardim das Flores', 'Escola Nova Geração',      'TARDE', 2, 'IDA',   'Rua Aurora, 77 - Jardim das Flores',          NULL,                                              NULL, 'PENDENTE', FALSE, '2026-08-13', 1),
('Larissa Martins Cardoso',   '(11) 92222-1003', 'Vila Nova',         'Escola Nova Geração',      'TARDE', 1, 'VOLTA', NULL,                                           'Rua Vila Nova, 300 - Vila Nova',                 NULL, 'PENDENTE', FALSE, '2026-08-14', 1);

-- =====================================================
-- DOCUMENTOS
-- =====================================================

INSERT INTO documento (tipo_documento, data_emissao, data_validade, status, id_condutor) VALUES
('CNH',                        '2021-06-15', '2031-06-15', 'VALIDO',  1),
('CRLV Perua',             '2025-08-20', '2026-08-20', 'VALIDO',  1),
('Vistoria Inspeção DETRAN',  '2025-07-01', '2026-07-01', 'VENCIDO', 1);

-- =====================================================
-- DESPESAS 
-- =====================================================
INSERT INTO despesa (tipo, descricao, valor, data, id_condutor) VALUES
('Combustível',        'Abastecimento do veículo escolar - agosto/2026',        850.00, '2026-08-03', 1),
('Manutenção',          'Troca de óleo e revisão preventiva',                    420.00, '2026-08-06', 1),
('Seguro do veículo',   'Parcela mensal do seguro do veículo escolar',           380.00, '2026-08-10', 1),
('IPVA',                'Parcela mensal do IPVA 2026',                          210.00, '2026-08-10', 1),
('Salário do monitor',  'Pagamento mensal da monitora Fernanda Oliveira Souza', 1500.00, '2026-08-05', 1);


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