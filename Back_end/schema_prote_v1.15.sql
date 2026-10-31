-- =====================================================
-- SCHEMA PROTE ADM - v1.15
-- =====================================================
-- Estrutura completa + seed atualizado de outubro/2026
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
-- - responsáveis e alunos conforme DOCX de outubro/2026
-- - tabela itinerario_aluno removida
-- - presenca mantida vazia, sem registros antigos
-- - mensalidades somente de outubro/2026, conciliadas com as fotos
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


-- ESCOLAS
INSERT INTO escola (nome, endereco) VALUES
('Creche Basileia', 'Rua Dr. Soares Brandão Filho, 40 - Vila Basileia'),
('Escola Gastão Montinho', 'Rua Coronel João da Silva Feijó, 40 - Parque Mandaqui');

-- RESPONSÁVEIS. Telefones e endereços fictícios para campos obrigatórios ausentes nas fontes.
INSERT INTO responsavel (nome, telefone, telefone_emergencia, email, endereco, quantidade_alunos) VALUES
('Thayanara Silva', '11956883159', '11983377828', NULL, 'Rua Francisco Arcuri, 444 - Pedra Branca', 1),
('Camilla Rodrigues', '11906204001', '11901435385', NULL, 'Rua Irmão João Creff, 311 - Vila Aurora', 1),
('Marco Aurélio', '11943859527', '11978000487', NULL, 'Rua João de Laet, 114 - Vila Aurora', 1),
('Larissa M', '11941293894', '11918464731', NULL, 'Rua Apetumbi, 301 - Horto Florestal', 1),
('Lilian Almeida', '11994936219', '11957841465', NULL, 'Rua Wanda Martin, 306 - Vila Amélia', 1),
('Mãe de Bryant e Maytê', '11956003813', '11953149505', NULL, 'Rua Wanda Martin, 130 - Vila Amélia', 2),
('Mãe do Mateo', '11959341220', '11983390680', NULL, 'Rua Lacerda Marques, 477 - Lauzane Paulista', 1),
('Pamela Lima M', '11938338945', '11947683474', NULL, 'Rua Antônio Gomes da Silva, 159 - Horto Florestal', 2),
('Ana Carolina', '11968482479', '11933547417', NULL, 'Rua José Ferreira de Castro, 210 - Vila Amélia', 1),
('Natalia C', '11936002925', '11938027645', NULL, 'Rua Laudelino Bicudo, 161 - Lauzane Paulista', 1),
('Cristiane C S', '11955951526', '11909470080', NULL, 'Rua Itapora de Goiás, 192 - Jardim Santa Inês', 1),
('Mãe do Breno', '11990326909', '11984934950', NULL, 'Rua Dário Vilares Barbosa, 410 - Peri Alto', 1),
('Fernanda V S', '11920758325', '11989812419', NULL, 'Avenida Professor Oscar Augusto Guelli, 163 - Vila Amélia', 2),
('Bruna Benedito B', '11919479717', '11990943963', NULL, 'Rua Jani Penoy Arcuri, 151 - Pedra Branca', 2),
('Carlos Henrique C (?)', '11965299532', '11910548084', NULL, 'Rua Antônio Gomes da Silva, 360 - Horto Florestal', 1),
('Pai do Miguel', '11991664262', '11916600741', NULL, 'Rua Sousa Lopes, 395 - Lauzane Paulista', 1),
('Wesley Lucas', '11992226127', '11979401990', NULL, 'Rua Itapora de Goiás, 353 - Jardim Santa Inês', 1),
('Pai do kevin', '11908904695', '11947609132', NULL, 'Rua Apetumbi, 101 - Horto Florestal', 1),
('Mãe da yasmin', '11972870805', '11930744123', NULL, 'Rua Conselheiro Moreira de Barros, 180 - Lauzane Paulista', 1),
('Pai da antonella', '11923908708', '11973252200', NULL, 'Avenida Santa Inês, 157 - Jardim Santa Inês', 1),
('Mãe do samuel', '11937176656', '11946198089', NULL, 'Rua Albertina Vieira da Silva Gordo, 186 - Vila Aurora', 1),
('Pai do lian', '11944697742', '11936734196', NULL, 'Rua do Horto, 243 - Horto Florestal', 1),
('Pai da manu', '11983499351', '11911880411', NULL, 'Rua José Maria Peixoto, 304 - Peri Alto', 1),
('Izaelma dos S', '11967764988', '11941898070', NULL, 'Rua Ângelo Capricho, 341 - Horto Florestal', 1),
('Laine Oliveira', '11974451744', '11973538324', NULL, 'Avenida Santa Inês, 365 - Jardim Santa Inês', 1),
('Vivian', '11997850250', '11988366814', NULL, 'Avenida Professor Oscar Augusto Guelli, 340 - Vila Amélia', 1),
('Fernando', '11919570495', '11974753819', NULL, 'Rua Jani Penoy Arcuri, 459 - Pedra Branca', 1),
('Ana Luiza', '11965935364', '11997993592', NULL, 'Rua Parateí, 350 - Lauzane Paulista', 1),
('Janaína Brito', '11931728503', '11988729833', NULL, 'Rua Itapora de Goiás, 153 - Jardim Santa Inês', 1),
('Dandara', '11917334744', '11991155725', NULL, 'Rua Parateí, 463 - Lauzane Paulista', 1),
('Mãe da Any Vitória', '11926866175', '11987573018', NULL, 'Rua Itapora de Goiás, 187 - Jardim Santa Inês', 1),
('Thainara B L', '11912631659', '11969414659', NULL, 'Avenida Professor Oscar Augusto Guelli, 282 - Vila Amélia', 1),
('Marina de Avellar', '11976774801', '11933525837', NULL, 'Rua Várzea Grande, 392 - Peri Alto', 1),
('Sérgio', '11998387633', '11935860453', NULL, 'Rua Eugênio da Silva, 257 - Horto Florestal', 1),
('Mãe do Pyetro', '11959399782', '11960998012', NULL, 'Rua Parateí, 475 - Lauzane Paulista', 1),
('Maria Eduarda', '11922677963', '11947809585', NULL, 'Rua José Maria Ferreira de Araújo, 293 - Vila Aurora', 1),
('Ana Maria MBC', '11939476257', '11975182837', NULL, 'Rua Jani Penoy Arcuri, 22 - Pedra Branca', 1),
('Kalorine C H', '11996787199', '11993097474', NULL, 'Rua Vinte de Julho, 92 - Vila Amélia', 2),
('Mãe do Diego', '11952703804', '11989842651', NULL, 'Rua Índio Peri, 450 - Pedra Branca', 1),
('J William MS', '11967749485', '11994371797', NULL, 'Rua João de Laet, 78 - Vila Aurora', 1),
('Luciana F', '11920842535', '11906383345', NULL, 'Rua Almirante Paraguaçu de Sá, 333 - Jardim Santa Inês', 1),
('Mãe do Bryant', '11931144370', '11934204790', NULL, 'Rua José Maria Ferreira de Araújo, 61 - Vila Aurora', 1),
('Mãe do Jhon Ravel', '11940561082', '11969481918', NULL, 'Rua Ângelo Capricho, 310 - Horto Florestal', 1),
('André Rodrigues', '11959928754', '11962254740', NULL, 'Rua Jani Penoy Arcuri, 302 - Pedra Branca', 1),
('Marisa FSV', '11911265827', '11936578137', NULL, 'Rua Alfarrobeiras, 418 - Peri Alto', 1),
('Josilane RS', '11921802876', '11965011989', NULL, 'Rua Antônio Novaes, 213 - Lauzane Paulista', 1),
('Mãe do Arthur e Paulo', '11947307026', '11933188175', NULL, 'Rua Índio Peri, 192 - Pedra Branca', 2),
('Adriana', '11944551240', '11963374670', NULL, 'Avenida Professor Oscar Augusto Guelli, 266 - Vila Amélia', 1),
('Nayane Vasconcelos', '11978294058', '11914628264', NULL, 'Rua Alfarrobeiras, 329 - Peri Alto', 1),
('Mãe da Agata', '11991525863', '11932949024', NULL, 'Avenida Peri Ronchetti, 262 - Pedra Branca', 1),
('Mãe da Kamilly', '11973308845', '11974967118', NULL, 'Avenida Peri Ronchetti, 339 - Pedra Branca', 1),
('Gabriela', '11948637840', '11931424107', NULL, 'Rua Doutor Aureliano Duarte, 457 - Jardim Santa Inês', 2),
('Graciane Rosa P', '11963474237', '11996744763', NULL, 'Rua Evian, 199 - Lauzane Paulista', 1),
('Pai do Yago', '11983954178', '11953729003', NULL, 'Rua Índio Peri, 480 - Pedra Branca', 1),
('Jaqueline', '11965667057', '11910961192', NULL, 'Rua Alfarrobeiras, 456 - Peri Alto', 1),
('Amanda', '11973367249', '11939462412', NULL, 'Rua José Maria Peixoto, 161 - Peri Alto', 1),
('Aline', '11950955014', '11915259566', NULL, 'Rua Inácio Rego, 477 - Horto Florestal', 1),
('Pai do Renato e Serena', '11911009798', '11966580920', NULL, 'Rua Antônio Gomes da Silva, 98 - Horto Florestal', 2),
('Eva de Oliveira', '11937717038', '11933215337', NULL, 'Rua Irmão João Creff, 476 - Vila Aurora', 1),
('Pai do Miguel', '11967757729', '11999561098', NULL, 'Rua Luiz Alves de Araújo, 163 - Horto Florestal', 1),
('Pai do Paulinho', '11912085783', '11983076732', NULL, 'Rua Conselheiro Moreira de Barros, 229 - Lauzane Paulista', 1),
('Pai da Yasmin', '11912447236', '11987043767', NULL, 'Rua Santana dos Montes, 380 - Peri Alto', 1),
('Edilson', '11930852809', '11914279196', NULL, 'Rua Irmão João Creff, 302 - Vila Aurora', 1),
('Mãe da Manuela', '11956998529', '11919818099', NULL, 'Rua Irmão João Creff, 466 - Vila Aurora', 1),
('Adriana Jesus C', '11923042383', '11903265959', NULL, 'Rua Laudelino Bicudo, 156 - Lauzane Paulista', 1),
('Daniel Almeida', '11912439170', '11984443242', NULL, 'Rua Vinte de Julho, 258 - Vila Amélia', 1),
('Pai do Arthur', '11913745065', '11925930321', NULL, 'Rua Francisco Arcuri, 410 - Pedra Branca', 1),
('Pai da Nathaly', '11938379241', '11926264025', NULL, 'Rua Almirante Paraguaçu de Sá, 329 - Jardim Santa Inês', 1),
('Pai da Ana Laura', '11918407904', '11974837369', NULL, 'Rua Almirante Paraguaçu de Sá, 435 - Jardim Santa Inês', 1),
('Ana Paula', '11985370807', '11919753209', NULL, 'Rua Alfarrobeiras, 47 - Peri Alto', 1),
('Jhon Kevin C', '11971448326', '11998148334', NULL, 'Rua José Maria Peixoto, 332 - Peri Alto', 1),
('Ronaldo SP', '11937964884', '11974726962', NULL, 'Rua Francisco Goya, 77 - Vila Aurora', 1),
('Heraldo SP', '11906206021', '11978245069', NULL, 'Rua Dário Vilares Barbosa, 81 - Peri Alto', 1),
('Jefferson Silva', '11965992527', '11912395034', NULL, 'Rua José Ferreira de Castro, 205 - Vila Amélia', 1);

-- ALUNOS NOVOS DO DOCUMENTO. Dados de turno/endereço não fornecidos foram deixados NULL.
INSERT INTO aluno (nome, bairro, id_escola, turno, endereco_embarque, endereco_desembarque, tipo_trajeto, foto, dia_vencimento, necessidade_acessibilidade_temporaria, necessidade_acessibilidade_permanente, observacao_acessibilidade, id_responsavel, id_condutor) VALUES
('Emanuele', 'Pedra Branca', 1, NULL, 'Rua Francisco Arcuri, 444 - Pedra Branca', 'Rua Francisco Arcuri, 444 - Pedra Branca', NULL, NULL, 2, FALSE, FALSE, NULL, 1, 1),
('Leo Rodrigues Novais', 'Vila Aurora', 1, NULL, 'Rua Irmão João Creff, 311 - Vila Aurora', 'Rua Irmão João Creff, 311 - Vila Aurora', NULL, NULL, 4, FALSE, FALSE, NULL, 2, 1),
('Caio', 'Vila Aurora', 1, NULL, 'Rua João de Laet, 114 - Vila Aurora', 'Rua João de Laet, 114 - Vila Aurora', NULL, NULL, 4, FALSE, FALSE, NULL, 3, 1),
('José Davi', 'Horto Florestal', 1, NULL, 'Rua Apetumbi, 301 - Horto Florestal', 'Rua Apetumbi, 301 - Horto Florestal', NULL, NULL, 5, FALSE, FALSE, NULL, 4, 1),
('Manu Lacerda', 'Vila Amélia', 1, NULL, 'Rua Wanda Martin, 306 - Vila Amélia', 'Rua Wanda Martin, 306 - Vila Amélia', NULL, NULL, 6, FALSE, FALSE, NULL, 5, 1),
('Mayte', 'Vila Amélia', 1, NULL, 'Rua Wanda Martin, 130 - Vila Amélia', 'Rua Wanda Martin, 130 - Vila Amélia', NULL, NULL, 6, FALSE, FALSE, NULL, 6, 1),
('Bryant', 'Vila Amélia', 1, NULL, 'Rua Wanda Martin, 130 - Vila Amélia', 'Rua Wanda Martin, 130 - Vila Amélia', NULL, NULL, 6, FALSE, FALSE, NULL, 6, 1),
('Mateo', 'Lauzane Paulista', 1, NULL, 'Rua Lacerda Marques, 477 - Lauzane Paulista', 'Rua Lacerda Marques, 477 - Lauzane Paulista', NULL, NULL, 6, FALSE, FALSE, NULL, 7, 1),
('Marina', 'Horto Florestal', 1, NULL, 'Rua Antônio Gomes da Silva, 159 - Horto Florestal', 'Rua Antônio Gomes da Silva, 159 - Horto Florestal', NULL, NULL, 6, FALSE, FALSE, NULL, 8, 1),
('Leo', 'Horto Florestal', 1, NULL, 'Rua Antônio Gomes da Silva, 159 - Horto Florestal', 'Rua Antônio Gomes da Silva, 159 - Horto Florestal', NULL, NULL, 6, FALSE, FALSE, NULL, 8, 1),
('Lavinia', 'Vila Amélia', 1, NULL, 'Rua José Ferreira de Castro, 210 - Vila Amélia', 'Rua José Ferreira de Castro, 210 - Vila Amélia', NULL, NULL, 7, FALSE, FALSE, NULL, 9, 1),
('Levi', 'Lauzane Paulista', 1, NULL, 'Rua Laudelino Bicudo, 161 - Lauzane Paulista', 'Rua Laudelino Bicudo, 161 - Lauzane Paulista', NULL, NULL, 9, FALSE, FALSE, NULL, 10, 1),
('Maria Ster', 'Jardim Santa Inês', 1, NULL, 'Rua Itapora de Goiás, 192 - Jardim Santa Inês', 'Rua Itapora de Goiás, 192 - Jardim Santa Inês', NULL, NULL, 9, FALSE, FALSE, NULL, 11, 1),
('Breno', 'Peri Alto', 1, NULL, 'Rua Dário Vilares Barbosa, 410 - Peri Alto', 'Rua Dário Vilares Barbosa, 410 - Peri Alto', NULL, NULL, 9, FALSE, FALSE, NULL, 12, 1),
('Gabriel', 'Vila Amélia', 1, NULL, 'Avenida Professor Oscar Augusto Guelli, 163 - Vila Amélia', 'Avenida Professor Oscar Augusto Guelli, 163 - Vila Amélia', NULL, NULL, 9, FALSE, FALSE, NULL, 13, 1),
('Arthur', 'Vila Amélia', 1, NULL, 'Avenida Professor Oscar Augusto Guelli, 163 - Vila Amélia', 'Avenida Professor Oscar Augusto Guelli, 163 - Vila Amélia', NULL, NULL, 9, FALSE, FALSE, NULL, 13, 1),
('Cecilia', 'Pedra Branca', 1, NULL, 'Rua Jani Penoy Arcuri, 151 - Pedra Branca', 'Rua Jani Penoy Arcuri, 151 - Pedra Branca', NULL, NULL, 10, FALSE, FALSE, NULL, 14, 1),
('Isabele', 'Pedra Branca', 1, NULL, 'Rua Jani Penoy Arcuri, 151 - Pedra Branca', 'Rua Jani Penoy Arcuri, 151 - Pedra Branca', NULL, NULL, 10, FALSE, FALSE, NULL, 14, 1),
('Isabelle', 'Horto Florestal', 1, NULL, 'Rua Antônio Gomes da Silva, 360 - Horto Florestal', 'Rua Antônio Gomes da Silva, 360 - Horto Florestal', NULL, NULL, 10, FALSE, FALSE, NULL, 15, 1),
('Miguel', 'Lauzane Paulista', 1, NULL, 'Rua Sousa Lopes, 395 - Lauzane Paulista', 'Rua Sousa Lopes, 395 - Lauzane Paulista', NULL, NULL, 12, FALSE, FALSE, NULL, 16, 1),
('Henry', 'Jardim Santa Inês', 1, NULL, 'Rua Itapora de Goiás, 353 - Jardim Santa Inês', 'Rua Itapora de Goiás, 353 - Jardim Santa Inês', NULL, NULL, 19, FALSE, FALSE, NULL, 17, 1),
('Kevin', 'Horto Florestal', 1, NULL, 'Rua Apetumbi, 101 - Horto Florestal', 'Rua Apetumbi, 101 - Horto Florestal', NULL, NULL, 24, FALSE, FALSE, NULL, 18, 1),
('Yasmin', 'Lauzane Paulista', 1, NULL, 'Rua Conselheiro Moreira de Barros, 180 - Lauzane Paulista', 'Rua Conselheiro Moreira de Barros, 180 - Lauzane Paulista', NULL, NULL, 25, FALSE, FALSE, NULL, 19, 1),
('Antonella', 'Jardim Santa Inês', 1, NULL, 'Avenida Santa Inês, 157 - Jardim Santa Inês', 'Avenida Santa Inês, 157 - Jardim Santa Inês', NULL, NULL, 25, FALSE, FALSE, NULL, 20, 1),
('Samuel', 'Vila Aurora', 1, NULL, 'Rua Albertina Vieira da Silva Gordo, 186 - Vila Aurora', 'Rua Albertina Vieira da Silva Gordo, 186 - Vila Aurora', NULL, NULL, 25, FALSE, FALSE, NULL, 21, 1),
('Lian', 'Horto Florestal', 1, NULL, 'Rua do Horto, 243 - Horto Florestal', 'Rua do Horto, 243 - Horto Florestal', NULL, NULL, 27, FALSE, FALSE, NULL, 22, 1),
('Manu Zurik', 'Peri Alto', 1, NULL, 'Rua José Maria Peixoto, 304 - Peri Alto', 'Rua José Maria Peixoto, 304 - Peri Alto', NULL, NULL, 20, FALSE, FALSE, NULL, 23, 1),
('Mirela', 'Horto Florestal', 1, NULL, 'Rua Ângelo Capricho, 341 - Horto Florestal', 'Rua Ângelo Capricho, 341 - Horto Florestal', NULL, NULL, 27, FALSE, FALSE, NULL, 24, 1),
('Henry Faria', 'Jardim Santa Inês', 1, NULL, 'Avenida Santa Inês, 365 - Jardim Santa Inês', 'Avenida Santa Inês, 365 - Jardim Santa Inês', NULL, NULL, 1, FALSE, FALSE, NULL, 25, 1),
('Catarina', 'Vila Amélia', 1, NULL, 'Avenida Professor Oscar Augusto Guelli, 340 - Vila Amélia', 'Avenida Professor Oscar Augusto Guelli, 340 - Vila Amélia', NULL, NULL, 20, FALSE, FALSE, NULL, 26, 1),
('João Friburgo', 'Pedra Branca', 1, NULL, 'Rua Jani Penoy Arcuri, 459 - Pedra Branca', 'Rua Jani Penoy Arcuri, 459 - Pedra Branca', NULL, NULL, 19, FALSE, FALSE, NULL, 27, 1),
('Benjamin', 'Lauzane Paulista', 1, NULL, 'Rua Parateí, 350 - Lauzane Paulista', 'Rua Parateí, 350 - Lauzane Paulista', NULL, NULL, 5, FALSE, FALSE, NULL, 28, 1),
('Eloa', 'Jardim Santa Inês', 1, NULL, 'Rua Itapora de Goiás, 153 - Jardim Santa Inês', 'Rua Itapora de Goiás, 153 - Jardim Santa Inês', NULL, NULL, 10, FALSE, FALSE, NULL, 29, 1),
('Luiz', 'Lauzane Paulista', 1, NULL, 'Rua Parateí, 463 - Lauzane Paulista', 'Rua Parateí, 463 - Lauzane Paulista', NULL, NULL, 15, FALSE, FALSE, NULL, 30, 1),
('Any Victoria', 'Jardim Santa Inês', 1, NULL, 'Rua Itapora de Goiás, 187 - Jardim Santa Inês', 'Rua Itapora de Goiás, 187 - Jardim Santa Inês', NULL, NULL, 18, FALSE, FALSE, NULL, 31, 1),
('Theo', 'Vila Amélia', 1, NULL, 'Avenida Professor Oscar Augusto Guelli, 282 - Vila Amélia', 'Avenida Professor Oscar Augusto Guelli, 282 - Vila Amélia', NULL, NULL, 21, FALSE, FALSE, NULL, 32, 1),
('Mateo', 'Peri Alto', 1, NULL, 'Rua Várzea Grande, 392 - Peri Alto', 'Rua Várzea Grande, 392 - Peri Alto', NULL, NULL, 6, FALSE, FALSE, NULL, 33, 1),
('Caio', 'Horto Florestal', 1, NULL, 'Rua Eugênio da Silva, 257 - Horto Florestal', 'Rua Eugênio da Silva, 257 - Horto Florestal', NULL, NULL, 21, FALSE, FALSE, NULL, 34, 1),
('Pyetro', 'Lauzane Paulista', 1, NULL, 'Rua Parateí, 475 - Lauzane Paulista', 'Rua Parateí, 475 - Lauzane Paulista', NULL, NULL, 24, FALSE, FALSE, NULL, 35, 1),
('Davi Henrique', 'Vila Aurora', 1, NULL, 'Rua José Maria Ferreira de Araújo, 293 - Vila Aurora', 'Rua José Maria Ferreira de Araújo, 293 - Vila Aurora', NULL, NULL, 6, FALSE, FALSE, NULL, 36, 1),
('José Mario', 'Pedra Branca', 2, NULL, 'Rua Jani Penoy Arcuri, 22 - Pedra Branca', 'Rua Jani Penoy Arcuri, 22 - Pedra Branca', NULL, NULL, 22, FALSE, FALSE, NULL, 37, 1),
('Lucas', 'Vila Amélia', 2, NULL, 'Rua Vinte de Julho, 92 - Vila Amélia', 'Rua Vinte de Julho, 92 - Vila Amélia', NULL, NULL, 3, FALSE, FALSE, NULL, 38, 1),
('Victor', 'Vila Amélia', 2, NULL, 'Rua Vinte de Julho, 92 - Vila Amélia', 'Rua Vinte de Julho, 92 - Vila Amélia', NULL, NULL, 3, FALSE, FALSE, NULL, 38, 1),
('Diego', 'Pedra Branca', 2, NULL, 'Rua Índio Peri, 450 - Pedra Branca', 'Rua Índio Peri, 450 - Pedra Branca', NULL, NULL, 4, FALSE, FALSE, NULL, 39, 1),
('Artur-Horto', 'Vila Aurora', 2, NULL, 'Rua João de Laet, 78 - Vila Aurora', 'Rua João de Laet, 78 - Vila Aurora', NULL, NULL, 5, FALSE, FALSE, NULL, 40, 1),
('Luan', 'Jardim Santa Inês', 2, NULL, 'Rua Almirante Paraguaçu de Sá, 333 - Jardim Santa Inês', 'Rua Almirante Paraguaçu de Sá, 333 - Jardim Santa Inês', NULL, NULL, 5, FALSE, FALSE, NULL, 41, 1),
('Bryant', 'Vila Aurora', 2, NULL, 'Rua José Maria Ferreira de Araújo, 61 - Vila Aurora', 'Rua José Maria Ferreira de Araújo, 61 - Vila Aurora', NULL, NULL, 5, FALSE, FALSE, NULL, 42, 1),
('Jhon Ravel', 'Horto Florestal', 2, NULL, 'Rua Ângelo Capricho, 310 - Horto Florestal', 'Rua Ângelo Capricho, 310 - Horto Florestal', NULL, NULL, 20, FALSE, FALSE, NULL, 43, 1),
('Helena', 'Pedra Branca', 2, NULL, 'Rua Jani Penoy Arcuri, 302 - Pedra Branca', 'Rua Jani Penoy Arcuri, 302 - Pedra Branca', NULL, NULL, 8, FALSE, FALSE, NULL, 44, 1),
('Thayna', 'Peri Alto', 2, NULL, 'Rua Alfarrobeiras, 418 - Peri Alto', 'Rua Alfarrobeiras, 418 - Peri Alto', NULL, NULL, 9, FALSE, FALSE, NULL, 45, 1),
('Alana', 'Lauzane Paulista', 2, NULL, 'Rua Antônio Novaes, 213 - Lauzane Paulista', 'Rua Antônio Novaes, 213 - Lauzane Paulista', NULL, NULL, 9, FALSE, FALSE, NULL, 46, 1),
('Paulo', 'Pedra Branca', 2, NULL, 'Rua Índio Peri, 192 - Pedra Branca', 'Rua Índio Peri, 192 - Pedra Branca', NULL, NULL, 16, FALSE, FALSE, NULL, 47, 1),
('Arthur', 'Pedra Branca', 2, NULL, 'Rua Índio Peri, 192 - Pedra Branca', 'Rua Índio Peri, 192 - Pedra Branca', NULL, NULL, 16, FALSE, FALSE, NULL, 47, 1),
('Isabele', 'Vila Amélia', 2, NULL, 'Avenida Professor Oscar Augusto Guelli, 266 - Vila Amélia', 'Avenida Professor Oscar Augusto Guelli, 266 - Vila Amélia', NULL, NULL, 10, FALSE, FALSE, NULL, 48, 1),
('Victoria Peri', 'Peri Alto', 2, NULL, 'Rua Alfarrobeiras, 329 - Peri Alto', 'Rua Alfarrobeiras, 329 - Peri Alto', NULL, NULL, 10, FALSE, FALSE, NULL, 49, 1),
('Agata', 'Pedra Branca', 2, NULL, 'Avenida Peri Ronchetti, 262 - Pedra Branca', 'Avenida Peri Ronchetti, 262 - Pedra Branca', NULL, NULL, 15, FALSE, FALSE, NULL, 50, 1),
('Kamilly', 'Pedra Branca', 2, NULL, 'Avenida Peri Ronchetti, 339 - Pedra Branca', 'Avenida Peri Ronchetti, 339 - Pedra Branca', NULL, NULL, 10, FALSE, FALSE, NULL, 51, 1),
('Elisa', 'Jardim Santa Inês', 2, NULL, 'Rua Doutor Aureliano Duarte, 457 - Jardim Santa Inês', 'Rua Doutor Aureliano Duarte, 457 - Jardim Santa Inês', NULL, NULL, 10, FALSE, FALSE, NULL, 52, 1),
('Maria Eduarda', 'Jardim Santa Inês', 2, NULL, 'Rua Doutor Aureliano Duarte, 457 - Jardim Santa Inês', 'Rua Doutor Aureliano Duarte, 457 - Jardim Santa Inês', NULL, NULL, 10, FALSE, FALSE, NULL, 52, 1),
('Livia', 'Lauzane Paulista', 2, NULL, 'Rua Evian, 199 - Lauzane Paulista', 'Rua Evian, 199 - Lauzane Paulista', NULL, NULL, 10, FALSE, FALSE, NULL, 53, 1),
('Yago', 'Pedra Branca', 2, NULL, 'Rua Índio Peri, 480 - Pedra Branca', 'Rua Índio Peri, 480 - Pedra Branca', NULL, NULL, 20, FALSE, FALSE, NULL, 54, 1),
('Esdras', 'Peri Alto', 2, NULL, 'Rua Alfarrobeiras, 456 - Peri Alto', 'Rua Alfarrobeiras, 456 - Peri Alto', NULL, NULL, 10, FALSE, FALSE, NULL, 55, 1),
('Beatriz', 'Peri Alto', 2, NULL, 'Rua José Maria Peixoto, 161 - Peri Alto', 'Rua José Maria Peixoto, 161 - Peri Alto', NULL, NULL, 11, FALSE, FALSE, NULL, 56, 1),
('Amanda', 'Horto Florestal', 2, NULL, 'Rua Inácio Rego, 477 - Horto Florestal', 'Rua Inácio Rego, 477 - Horto Florestal', NULL, NULL, 12, FALSE, FALSE, NULL, 57, 1),
('Renato', 'Horto Florestal', 2, NULL, 'Rua Antônio Gomes da Silva, 98 - Horto Florestal', 'Rua Antônio Gomes da Silva, 98 - Horto Florestal', NULL, NULL, 15, FALSE, FALSE, NULL, 58, 1),
('Serena', 'Horto Florestal', 2, NULL, 'Rua Antônio Gomes da Silva, 98 - Horto Florestal', 'Rua Antônio Gomes da Silva, 98 - Horto Florestal', NULL, NULL, 15, FALSE, FALSE, NULL, 58, 1),
('Lara', 'Vila Aurora', 2, NULL, 'Rua Irmão João Creff, 476 - Vila Aurora', 'Rua Irmão João Creff, 476 - Vila Aurora', NULL, NULL, 15, FALSE, FALSE, NULL, 59, 1),
('Miguel', 'Horto Florestal', 2, NULL, 'Rua Luiz Alves de Araújo, 163 - Horto Florestal', 'Rua Luiz Alves de Araújo, 163 - Horto Florestal', NULL, NULL, 17, FALSE, FALSE, NULL, 60, 1),
('Paulinho', 'Lauzane Paulista', 2, NULL, 'Rua Conselheiro Moreira de Barros, 229 - Lauzane Paulista', 'Rua Conselheiro Moreira de Barros, 229 - Lauzane Paulista', NULL, NULL, 20, FALSE, FALSE, NULL, 61, 1),
('Yasmin', 'Peri Alto', 2, NULL, 'Rua Santana dos Montes, 380 - Peri Alto', 'Rua Santana dos Montes, 380 - Peri Alto', NULL, NULL, 20, FALSE, FALSE, NULL, 62, 1),
('Geovana', 'Vila Aurora', 2, NULL, 'Rua Irmão João Creff, 302 - Vila Aurora', 'Rua Irmão João Creff, 302 - Vila Aurora', NULL, NULL, 21, FALSE, FALSE, NULL, 63, 1),
('Manuela', 'Vila Aurora', 2, NULL, 'Rua Irmão João Creff, 466 - Vila Aurora', 'Rua Irmão João Creff, 466 - Vila Aurora', NULL, NULL, 21, FALSE, FALSE, NULL, 64, 1),
('João Lucas', 'Lauzane Paulista', 2, NULL, 'Rua Laudelino Bicudo, 156 - Lauzane Paulista', 'Rua Laudelino Bicudo, 156 - Lauzane Paulista', NULL, NULL, 22, FALSE, FALSE, NULL, 65, 1),
('Alice (Osório)', 'Vila Amélia', 2, NULL, 'Rua Vinte de Julho, 258 - Vila Amélia', 'Rua Vinte de Julho, 258 - Vila Amélia', NULL, NULL, 22, FALSE, FALSE, NULL, 66, 1),
('Arthur (Cida)', 'Pedra Branca', 2, NULL, 'Rua Francisco Arcuri, 410 - Pedra Branca', 'Rua Francisco Arcuri, 410 - Pedra Branca', NULL, NULL, 1, FALSE, FALSE, NULL, 67, 1),
('Nathaly', 'Jardim Santa Inês', 2, NULL, 'Rua Almirante Paraguaçu de Sá, 329 - Jardim Santa Inês', 'Rua Almirante Paraguaçu de Sá, 329 - Jardim Santa Inês', NULL, NULL, 23, FALSE, FALSE, NULL, 68, 1),
('Ana Laura', 'Jardim Santa Inês', 2, NULL, 'Rua Almirante Paraguaçu de Sá, 435 - Jardim Santa Inês', 'Rua Almirante Paraguaçu de Sá, 435 - Jardim Santa Inês', NULL, NULL, 24, FALSE, FALSE, NULL, 69, 1),
('Kauã', 'Peri Alto', 2, NULL, 'Rua Alfarrobeiras, 47 - Peri Alto', 'Rua Alfarrobeiras, 47 - Peri Alto', NULL, NULL, 30, FALSE, FALSE, NULL, 70, 1),
('Ary Thiago', 'Peri Alto', 2, NULL, 'Rua José Maria Peixoto, 332 - Peri Alto', 'Rua José Maria Peixoto, 332 - Peri Alto', NULL, NULL, 23, FALSE, FALSE, NULL, 71, 1),
('Heloiza', 'Vila Aurora', 2, NULL, 'Rua Francisco Goya, 77 - Vila Aurora', 'Rua Francisco Goya, 77 - Vila Aurora', NULL, NULL, 11, FALSE, FALSE, NULL, 72, 1),
('Fanny Santos', 'Peri Alto', 2, NULL, 'Rua Dário Vilares Barbosa, 81 - Peri Alto', 'Rua Dário Vilares Barbosa, 81 - Peri Alto', NULL, NULL, 14, FALSE, FALSE, NULL, 73, 1),
('Ana Flavia', 'Vila Amélia', 2, NULL, 'Rua José Ferreira de Castro, 205 - Vila Amélia', 'Rua José Ferreira de Castro, 205 - Vila Amélia', NULL, NULL, 15, FALSE, FALSE, NULL, 74, 1);

-- PRESENÇA: tabela mantida vazia; todos os registros antigos foram descartados.

-- SOMENTE MENSALIDADES DE OUTUBRO/2026. Não há mensalidades de setembro.
-- Data de pagamento não consta no caderno; permanece NULL mesmo nas pagas para não inventar data.
INSERT INTO mensalidade (id_aluno, valor, data_vencimento, data_pagamento, status, id_condutor, mes_referencia) VALUES
(1, 230.00, '2026-10-02', NULL, 'PAGO', 1, '2026-10'),
(2, 235.00, '2026-10-04', NULL, 'PAGO', 1, '2026-10'),
(3, 225.00, '2026-10-04', NULL, 'PAGO', 1, '2026-10'),
(4, 200.00, '2026-10-05', NULL, 'PAGO', 1, '2026-10'),
(5, 230.00, '2026-10-06', NULL, 'PAGO', 1, '2026-10'),
(6, 180.00, '2026-10-06', NULL, 'PAGO', 1, '2026-10'),
(7, 180.00, '2026-10-06', NULL, 'PAGO', 1, '2026-10'),
(8, 170.00, '2026-10-06', NULL, 'PAGO', 1, '2026-10'),
(9, 135.00, '2026-10-06', NULL, 'PAGO', 1, '2026-10'),
(10, 135.00, '2026-10-06', NULL, 'PAGO', 1, '2026-10'),
(11, 220.00, '2026-10-07', NULL, 'PAGO', 1, '2026-10'),
(12, 210.00, '2026-10-09', NULL, 'PAGO', 1, '2026-10'),
(13, 240.00, '2026-10-09', NULL, 'PAGO', 1, '2026-10'),
(14, 200.00, '2026-10-09', NULL, 'PAGO', 1, '2026-10'),
(15, 130.00, '2026-10-09', NULL, 'PAGO', 1, '2026-10'),
(16, 130.00, '2026-10-09', NULL, 'PAGO', 1, '2026-10'),
(17, 150.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(18, 150.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(19, 215.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(20, 180.00, '2026-10-12', NULL, 'PAGO', 1, '2026-10'),
(21, 250.00, '2026-10-19', NULL, 'PAGO', 1, '2026-10'),
(22, 200.00, '2026-10-24', NULL, 'PAGO', 1, '2026-10'),
(23, 190.00, '2026-10-25', NULL, 'PAGO', 1, '2026-10'),
(24, 215.00, '2026-10-25', NULL, 'PAGO', 1, '2026-10'),
(25, 220.00, '2026-10-25', NULL, 'PAGO', 1, '2026-10'),
(26, 210.00, '2026-10-27', NULL, 'PAGO', 1, '2026-10'),
(27, 210.00, '2026-10-20', NULL, 'ATRASADO', 1, '2026-10'),
(28, 200.00, '2026-10-27', NULL, 'PAGO', 1, '2026-10'),
(29, 230.00, '2026-10-01', NULL, 'PAGO', 1, '2026-10'),
(30, 150.00, '2026-10-20', NULL, 'PAGO', 1, '2026-10'),
(31, 250.00, '2026-10-19', NULL, 'PAGO', 1, '2026-10'),
(32, 190.00, '2026-10-05', NULL, 'PAGO', 1, '2026-10'),
(33, 220.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(34, 170.00, '2026-10-15', NULL, 'PAGO', 1, '2026-10'),
(35, 260.00, '2026-10-18', NULL, 'PAGO', 1, '2026-10'),
(36, 220.00, '2026-10-21', NULL, 'PAGO', 1, '2026-10'),
(37, 280.00, '2026-10-06', NULL, 'PAGO', 1, '2026-10'),
(38, 160.00, '2026-10-21', NULL, 'PAGO', 1, '2026-10'),
(39, 230.00, '2026-10-24', NULL, 'ATRASADO', 1, '2026-10'),
(40, 195.00, '2026-10-06', NULL, 'PAGO', 1, '2026-10'),
(41, 300.00, '2026-10-22', NULL, 'PAGO', 1, '2026-10'),
(42, 500.00, '2026-10-03', NULL, 'PAGO', 1, '2026-10'),
(43, 500.00, '2026-10-03', NULL, 'PAGO', 1, '2026-10'),
(44, 230.00, '2026-10-04', NULL, 'PAGO', 1, '2026-10'),
(45, 175.00, '2026-10-05', NULL, 'PAGO', 1, '2026-10'),
(46, 290.00, '2026-10-05', NULL, 'PAGO', 1, '2026-10'),
(47, 300.00, '2026-10-05', NULL, 'PAGO', 1, '2026-10'),
(48, 200.00, '2026-10-20', NULL, 'PAGO', 1, '2026-10'),
(49, 230.00, '2026-10-08', NULL, 'PAGO', 1, '2026-10'),
(50, 180.00, '2026-10-09', NULL, 'PAGO', 1, '2026-10'),
(51, 200.00, '2026-10-09', NULL, 'PAGO', 1, '2026-10'),
(52, 175.00, '2026-10-16', NULL, 'PAGO', 1, '2026-10'),
(53, 175.00, '2026-10-16', NULL, 'PAGO', 1, '2026-10'),
(54, 200.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(55, 330.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(56, 230.00, '2026-10-15', NULL, 'PAGO', 1, '2026-10'),
(57, 270.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(58, 190.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(59, 190.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(60, 210.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(61, 190.00, '2026-10-20', NULL, 'PAGO', 1, '2026-10'),
(62, 200.00, '2026-10-10', NULL, 'PAGO', 1, '2026-10'),
(63, 220.00, '2026-10-11', NULL, 'PAGO', 1, '2026-10'),
(64, 220.00, '2026-10-12', NULL, 'PAGO', 1, '2026-10'),
(65, 227.00, '2026-10-15', NULL, 'PAGO', 1, '2026-10'),
(66, 227.00, '2026-10-15', NULL, 'PAGO', 1, '2026-10'),
(67, 200.00, '2026-10-15', NULL, 'PAGO', 1, '2026-10'),
(68, 205.00, '2026-10-17', NULL, 'PAGO', 1, '2026-10'),
(69, 200.00, '2026-10-20', NULL, 'PAGO', 1, '2026-10'),
(70, 235.00, '2026-10-20', NULL, 'PAGO', 1, '2026-10'),
(71, 215.00, '2026-10-21', NULL, 'PAGO', 1, '2026-10'),
(72, 210.00, '2026-10-21', NULL, 'PAGO', 1, '2026-10'),
(73, 205.00, '2026-10-22', NULL, 'PAGO', 1, '2026-10'),
(74, 300.00, '2026-10-22', NULL, 'PAGO', 1, '2026-10'),
(75, 400.00, '2026-10-01', NULL, 'ATRASADO', 1, '2026-10'),
(76, 215.00, '2026-10-23', NULL, 'PAGO', 1, '2026-10'),
(77, 220.00, '2026-10-24', NULL, 'ATRASADO', 1, '2026-10'),
(78, 185.00, '2026-10-30', NULL, 'PAGO', 1, '2026-10'),
(79, 230.00, '2026-10-23', NULL, 'PAGO', 1, '2026-10'),
(80, 200.00, '2026-10-11', NULL, 'PAGO', 1, '2026-10'),
(81, 220.00, '2026-10-14', NULL, 'PAGO', 1, '2026-10'),
(82, 200.00, '2026-10-15', NULL, 'PAGO', 1, '2026-10');

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
