-- Renomeia o identificador preservando valores, unicidade e todas as contas.
ALTER TABLE users CHANGE COLUMN email login VARCHAR(190) NOT NULL;
