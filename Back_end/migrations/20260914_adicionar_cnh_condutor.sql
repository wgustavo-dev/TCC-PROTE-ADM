-- Execute uma vez em bancos já existentes antes de publicar a versão.
ALTER TABLE condutor
  ADD COLUMN cnh VARCHAR(11) NULL AFTER telefone,
  ADD CONSTRAINT uq_condutor_cnh UNIQUE (cnh);
