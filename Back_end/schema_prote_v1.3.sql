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


-- Tstando criação de alunos, cada aluno precisa de um resposavel e um condutor(apaga dps)

INSERT INTO responsavel (nome, telefone, email, endereco, quantidade_alunos)
VALUES ('Maria Silva', '11999999999', 'maria@email.com', 'Rua das Flores, 100', 1);

INSERT INTO condutor (nome, email, telefone, escolas, possui_monitor)
VALUES ('Carlos Souza', 'carlos@email.com', '11988888888', 'Escola Estadual São Paulo', false);

-- =========================
-- SEED: ORÇAMENTOS
-- =========================
-- Depende do condutor id=1 (Carlos Souza) já inserido no schema

INSERT INTO orcamento (nome_cliente, telefone, bairro, escola, turno, quantidade_alunos, tipo_trajeto, endereco_embarque, endereco_desembarque, valor, status, convertido, data_solicitacao, id_condutor)
VALUES
  ('Ana Beatriz Costa',    '11991111111', 'Jardim Paulista',  'Escola Estadual São Paulo',  'MANHA', 1, 'AMBOS', 'Rua das Rosas, 45',            'Escola Estadual São Paulo',  580.00, 'PENDENTE',  FALSE, '2025-04-01', 1),
  ('Fernando Lima',        '11992222222', 'Vila Mariana',     'Colégio Objetivo',           'TARDE', 1, 'IDA',   'Av. Paulista, 200',            'Colégio Objetivo',           320.00, 'PENDENTE',  FALSE, '2025-04-03', 1),
  ('Juliana Mendes',       '11993333333', 'Mooca',            'EMEF Prof. João Batista',    'MANHA', 2, 'AMBOS', 'Rua da Mooca, 312',            'EMEF Prof. João Batista',    760.00, 'APROVADO',  TRUE,  '2025-03-10', 1),
  ('Roberto Alves',        '11994444444', 'Tatuapé',          'Colégio Santa Cruz',         'TARDE', 1, 'VOLTA', 'Colégio Santa Cruz',           'Rua Tuiuti, 89',             290.00, 'APROVADO',  TRUE,  '2025-03-15', 1),
  ('Patrícia Nunes',       '11995555555', 'Ipiranga',         'Escola Estadual São Paulo',  'NOITE', 1, 'IDA',   'Rua do Hipódromo, 7',          'Escola Estadual São Paulo',  300.00, 'RECUSADO',  FALSE, '2025-03-20', 1),
  ('Marcos Ferreira',      '11996666666', 'Santana',          'EMEI Girassol',              'MANHA', 3, 'AMBOS', 'Rua Voluntários da Pátria, 55','EMEI Girassol',              980.00, 'PENDENTE',  FALSE, '2025-04-05', 1),
  ('Cláudia Rocha',        '11997777777', 'Pinheiros',        'Colégio Objetivo',           'TARDE', 1, 'AMBOS', 'Rua dos Pinheiros, 130',       'Colégio Objetivo',           600.00, 'APROVADO',  TRUE,  '2025-02-28', 1),
  ('Eduardo Barbosa',      '11998888888', 'Lapa',             'Escola Estadual São Paulo',  'MANHA', 2, 'IDA',   'Av. Ermano Marchetti, 22',     'Escola Estadual São Paulo',  500.00, 'PENDENTE',  FALSE, '2025-04-08', 1);


-- =========================
-- SEED: DESPESAS
-- =========================

INSERT INTO despesa (tipo, descricao, valor, data)
VALUES
  ('Combustível',         'Abastecimento completo — posto Shell Tatuapé',           350.00, '2025-04-02'),
  ('Combustível',         'Abastecimento parcial — rota Mooca/Ipiranga',            180.00, '2025-04-09'),
  ('Manutenção Mecânica', 'Troca de óleo e filtro — oficina do Zé',                 220.00, '2025-03-18'),
  ('Manutenção Mecânica', 'Revisão de freios dianteiros e traseiros',               480.00, '2025-03-25'),
  ('Pneus',               'Dois pneus traseiros novos — aro 16',                    790.00, '2025-02-14'),
  ('Pneus',               'Balanceamento e alinhamento dos 4 pneus',                120.00, '2025-04-01'),
  ('Seguro',              'Parcela mensal do seguro do veículo',                    410.00, '2025-04-05'),
  ('Licenciamento',       'IPVA + licenciamento anual 2025',                       1240.00, '2025-01-20'),
  ('Lavagem',             'Higienização completa interna e externa',                  85.00, '2025-04-10'),
  ('Lavagem',             'Lavagem simples pós-chuva',                               45.00, '2025-03-30'),
  ('Outros',              'Compra de triângulo e kit de primeiros socorros',         160.00, '2025-03-05'),
  ('Outros',              'Taxa de estacionamento — reunião na prefeitura',           30.00, '2025-04-07');


-- =========================
-- SEED: DOCUMENTOS / VISTORIAS
-- =========================
-- Depende do condutor id=1 (Carlos Souza) já inserido no schema
-- Prazos calculados conforme regras do sistema:
--   CNH                           → data_emissao + 10 anos
--   Tacógrafo Vistoria            → data_emissao +  2 anos
--   CRLV Perua                    → data_emissao +  1 ano
--   Vistoria Inspeção DETRAN      → data_emissao +  6 meses
--   CRMC                          → data_emissao +  5 anos
--   Certificado Registro Mun.     → data_emissao +  1 ano

INSERT INTO documento (tipo_documento, data_emissao, data_validade, status, id_condutor)
VALUES
  -- Válidos com folga
  ('CNH',                               '2021-06-15', '2031-06-15', 'VALIDO',  1),
  ('CRMC',                              '2023-01-10', '2028-01-10', 'VALIDO',  1),
  ('Tacógrafo Vistoria',                '2024-03-20', '2026-03-20', 'VALIDO',  1),

  -- Próximos do vencimento (~30 dias a partir de abr/2025)
  ('CRLV Perua',                        '2024-04-20', '2025-04-28', 'VALIDO',  1),
  ('Certificado de Registro Municipal', '2024-05-01', '2025-05-05', 'VALIDO',  1),

  -- Vencido
  ('Vistoria Inspeção DETRAN',          '2024-08-10', '2025-02-10', 'VENCIDO', 1);

select * from aluno