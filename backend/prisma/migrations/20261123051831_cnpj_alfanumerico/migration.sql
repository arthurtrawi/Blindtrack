-- =============================================================
-- [SQL MANUAL] CNPJ alfanumérico (IN RFB 2.229/2024, vigente desde jul/2026)
-- CNPJ: 12 caracteres [0-9A-Z] + 2 dígitos verificadores numéricos.
-- CPF continua com 11 dígitos. Os DVs são validados na aplicação (src/utils/documento.ts).
-- =============================================================
ALTER TABLE "clientes" DROP CONSTRAINT "clientes_cpf_cnpj_chk";

ALTER TABLE "clientes" ADD CONSTRAINT "clientes_cpf_cnpj_chk"
  CHECK (
    ("tipo_pessoa" = 'FISICA'   AND "cpf_cnpj" ~ '^[0-9]{11}$') OR
    ("tipo_pessoa" = 'JURIDICA' AND "cpf_cnpj" ~ '^[0-9A-Z]{12}[0-9]{2}$')
  );
