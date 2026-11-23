-- =============================================================
-- [SQL MANUAL] Ajuste do erro lançado pelos triggers append-only (RN28)
--
-- A migration init usava SQLSTATE 23001 (restrict_violation), que o Prisma
-- traduz como P2003 "Foreign key constraint violated", uma mensagem enganosa.
-- P0001 (raise_exception) identifica corretamente uma regra violada.
-- Os triggers continuam os mesmos; só o corpo da função muda.
-- =============================================================
CREATE OR REPLACE FUNCTION impedir_alteracao_registro_imutavel() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Tabela "%" é somente de inserção: % não permitido', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'P0001',
          HINT = 'Registros de histórico, auditoria e replanejamento não podem ser alterados nem excluídos.';
END;
$$;
