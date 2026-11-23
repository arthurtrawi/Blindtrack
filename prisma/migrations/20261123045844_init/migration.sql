-- =============================================================
-- [SQL MANUAL] Número da OS (RN02 / ADR-09)
-- A sequence é atômica: não gera números duplicados sob concorrência.
-- Precisa existir ANTES da tabela ordens_servico, que a usa como DEFAULT.
-- =============================================================
CREATE SEQUENCE "os_numero_seq" START WITH 1 INCREMENT BY 1 NO CYCLE;

CREATE FUNCTION gerar_numero_os() RETURNS VARCHAR(20)
LANGUAGE sql VOLATILE AS $$
  SELECT 'OS-' || to_char(now() AT TIME ZONE 'UTC', 'YYYY') || '-' || lpad(nextval('os_numero_seq')::text, 6, '0')
$$;

-- CreateEnum
CREATE TYPE "perfil_usuario" AS ENUM ('ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO', 'CLIENTE');

-- CreateEnum
CREATE TYPE "tipo_pessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "status_ordem_servico" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'SUSPENSA', 'PRONTA_PARA_ENTREGA', 'ENTREGUE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "status_etapa" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'PAUSADA', 'CONCLUIDA', 'DISPENSADA');

-- CreateEnum
CREATE TYPE "tipo_ocorrencia" AS ENUM ('AGUARDANDO_PECA', 'PENDENCIA_DOCUMENTAL', 'RETRABALHO', 'ATRASO', 'OUTROS');

-- CreateEnum
CREATE TYPE "prioridade_ocorrencia" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "status_ocorrencia" AS ENUM ('ABERTA', 'EM_TRATAMENTO', 'RESOLVIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "tipo_documento" AS ENUM ('CONTRATO', 'CHECKLIST_VISTORIA', 'DECLARACAO_BLINDAGEM', 'TERMO_ENTREGA', 'NOTA_FISCAL', 'LAUDO_TECNICO', 'FOTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "status_documento" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "tipo_evento_historico" AS ENUM ('ORDEM_SERVICO', 'ETAPA', 'OCORRENCIA', 'DOCUMENTO');

-- CreateEnum
CREATE TYPE "acao_auditoria" AS ENUM ('CRIAR', 'ATUALIZAR', 'ALTERAR_STATUS', 'INATIVAR', 'REATIVAR');

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL,
    "tipo_pessoa" "tipo_pessoa" NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "cpf_cnpj" VARCHAR(14) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "cep" VARCHAR(8),
    "logradouro" VARCHAR(150),
    "numero" VARCHAR(10),
    "complemento" VARCHAR(60),
    "bairro" VARCHAR(80),
    "cidade" VARCHAR(80),
    "uf" CHAR(2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" UUID NOT NULL,
    "placa" VARCHAR(7) NOT NULL,
    "chassi" VARCHAR(17) NOT NULL,
    "marca" VARCHAR(50) NOT NULL,
    "modelo" VARCHAR(80) NOT NULL,
    "ano_fabricacao" SMALLINT NOT NULL,
    "ano_modelo" SMALLINT NOT NULL,
    "cor" VARCHAR(30) NOT NULL,
    "cliente_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "senha_hash" VARCHAR(100) NOT NULL,
    "perfil" "perfil_usuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "cliente_id" UUID,
    "ultimo_login_em" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_etapa" (
    "id" UUID NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "descricao" TEXT,
    "ordem" SMALLINT NOT NULL,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "modelos_etapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" UUID NOT NULL,
    "numero" VARCHAR(20) NOT NULL DEFAULT gerar_numero_os(),
    "veiculo_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "status" "status_ordem_servico" NOT NULL DEFAULT 'ABERTA',
    "data_entrada" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previsao_entrega" TIMESTAMPTZ(3) NOT NULL,
    "data_entrega" TIMESTAMPTZ(3),
    "observacoes" TEXT,
    "aberta_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapas_processo" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "modelo_etapa_id" UUID,
    "codigo" VARCHAR(40) NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "descricao" TEXT,
    "ordem" SMALLINT NOT NULL,
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "status" "status_etapa" NOT NULL DEFAULT 'PENDENTE',
    "responsavel_id" UUID,
    "data_inicio" TIMESTAMPTZ(3),
    "previsao_conclusao" TIMESTAMPTZ(3),
    "data_conclusao" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "etapas_processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "etapa_processo_id" UUID,
    "ocorrencia_id" UUID,
    "documento_id" UUID,
    "tipo_evento" "tipo_evento_historico" NOT NULL,
    "status_anterior" VARCHAR(30),
    "status_novo" VARCHAR(30) NOT NULL,
    "descricao" TEXT NOT NULL,
    "visivel_cliente" BOOLEAN NOT NULL DEFAULT false,
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alteracoes_previsao" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "etapa_processo_id" UUID,
    "ocorrencia_id" UUID,
    "previsao_anterior" TIMESTAMPTZ(3),
    "previsao_nova" TIMESTAMPTZ(3) NOT NULL,
    "justificativa" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alteracoes_previsao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocorrencias" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "etapa_processo_id" UUID,
    "titulo" VARCHAR(150) NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "tipo_ocorrencia" NOT NULL,
    "prioridade" "prioridade_ocorrencia" NOT NULL DEFAULT 'MEDIA',
    "status" "status_ocorrencia" NOT NULL DEFAULT 'ABERTA',
    "impeditiva" BOOLEAN NOT NULL DEFAULT false,
    "visivel_cliente" BOOLEAN NOT NULL DEFAULT false,
    "descricao_cliente" TEXT,
    "solucao" TEXT,
    "usuario_responsavel_id" UUID NOT NULL,
    "aberta_por_id" UUID NOT NULL,
    "data_abertura" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_resolucao" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ocorrencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "tipo" "tipo_documento" NOT NULL,
    "caminho_arquivo" VARCHAR(255) NOT NULL,
    "nome_original" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "hash_sha256" CHAR(64) NOT NULL,
    "status" "status_documento" NOT NULL DEFAULT 'PENDENTE',
    "visivel_cliente" BOOLEAN NOT NULL DEFAULT false,
    "enviado_por_id" UUID NOT NULL,
    "avaliado_por_id" UUID,
    "avaliado_em" TIMESTAMPTZ(3),
    "motivo_rejeicao" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "entidade" VARCHAR(50) NOT NULL,
    "entidade_id" UUID NOT NULL,
    "acao" "acao_auditoria" NOT NULL,
    "dados_anteriores" JSONB,
    "dados_novos" JSONB,
    "request_id" VARCHAR(64),
    "ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_cnpj_key" ON "clientes"("cpf_cnpj");

-- CreateIndex
CREATE INDEX "clientes_nome_idx" ON "clientes"("nome");

-- CreateIndex
CREATE INDEX "clientes_email_idx" ON "clientes"("email");

-- CreateIndex
CREATE INDEX "clientes_deleted_at_idx" ON "clientes"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_chassi_key" ON "veiculos"("chassi");

-- CreateIndex
CREATE INDEX "veiculos_cliente_id_idx" ON "veiculos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cliente_id_key" ON "usuarios"("cliente_id");

-- CreateIndex
CREATE INDEX "usuarios_perfil_ativo_idx" ON "usuarios"("perfil", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "modelos_etapa_codigo_key" ON "modelos_etapa"("codigo");

-- CreateIndex
CREATE INDEX "modelos_etapa_ativo_ordem_idx" ON "modelos_etapa"("ativo", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_numero_key" ON "ordens_servico"("numero");

-- CreateIndex
CREATE INDEX "ordens_servico_status_idx" ON "ordens_servico"("status");

-- CreateIndex
CREATE INDEX "ordens_servico_cliente_id_idx" ON "ordens_servico"("cliente_id");

-- CreateIndex
CREATE INDEX "ordens_servico_veiculo_id_idx" ON "ordens_servico"("veiculo_id");

-- CreateIndex
CREATE INDEX "ordens_servico_previsao_entrega_idx" ON "ordens_servico"("previsao_entrega");

-- CreateIndex
CREATE INDEX "ordens_servico_data_entrada_idx" ON "ordens_servico"("data_entrada");

-- CreateIndex
CREATE INDEX "etapas_processo_responsavel_id_status_idx" ON "etapas_processo"("responsavel_id", "status");

-- CreateIndex
CREATE INDEX "etapas_processo_status_previsao_conclusao_idx" ON "etapas_processo"("status", "previsao_conclusao");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_processo_ordem_servico_id_ordem_key" ON "etapas_processo"("ordem_servico_id", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "etapas_processo_ordem_servico_id_codigo_key" ON "etapas_processo"("ordem_servico_id", "codigo");

-- CreateIndex
CREATE INDEX "historico_status_ordem_servico_id_created_at_idx" ON "historico_status"("ordem_servico_id", "created_at");

-- CreateIndex
CREATE INDEX "historico_status_etapa_processo_id_idx" ON "historico_status"("etapa_processo_id");

-- CreateIndex
CREATE INDEX "alteracoes_previsao_ordem_servico_id_created_at_idx" ON "alteracoes_previsao"("ordem_servico_id", "created_at");

-- CreateIndex
CREATE INDEX "alteracoes_previsao_etapa_processo_id_idx" ON "alteracoes_previsao"("etapa_processo_id");

-- CreateIndex
CREATE INDEX "ocorrencias_ordem_servico_id_status_idx" ON "ocorrencias"("ordem_servico_id", "status");

-- CreateIndex
CREATE INDEX "ocorrencias_etapa_processo_id_status_idx" ON "ocorrencias"("etapa_processo_id", "status");

-- CreateIndex
CREATE INDEX "ocorrencias_usuario_responsavel_id_status_idx" ON "ocorrencias"("usuario_responsavel_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_caminho_arquivo_key" ON "documentos"("caminho_arquivo");

-- CreateIndex
CREATE INDEX "documentos_ordem_servico_id_tipo_status_idx" ON "documentos"("ordem_servico_id", "tipo", "status");

-- CreateIndex
CREATE INDEX "auditoria_entidade_entidade_id_created_at_idx" ON "auditoria"("entidade", "entidade_id", "created_at");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_created_at_idx" ON "auditoria"("usuario_id", "created_at");

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_aberta_por_id_fkey" FOREIGN KEY ("aberta_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_processo" ADD CONSTRAINT "etapas_processo_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_processo" ADD CONSTRAINT "etapas_processo_modelo_etapa_id_fkey" FOREIGN KEY ("modelo_etapa_id") REFERENCES "modelos_etapa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapas_processo" ADD CONSTRAINT "etapas_processo_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_etapa_processo_id_fkey" FOREIGN KEY ("etapa_processo_id") REFERENCES "etapas_processo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_ocorrencia_id_fkey" FOREIGN KEY ("ocorrencia_id") REFERENCES "ocorrencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracoes_previsao" ADD CONSTRAINT "alteracoes_previsao_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracoes_previsao" ADD CONSTRAINT "alteracoes_previsao_etapa_processo_id_fkey" FOREIGN KEY ("etapa_processo_id") REFERENCES "etapas_processo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracoes_previsao" ADD CONSTRAINT "alteracoes_previsao_ocorrencia_id_fkey" FOREIGN KEY ("ocorrencia_id") REFERENCES "ocorrencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracoes_previsao" ADD CONSTRAINT "alteracoes_previsao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_etapa_processo_id_fkey" FOREIGN KEY ("etapa_processo_id") REFERENCES "etapas_processo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_usuario_responsavel_id_fkey" FOREIGN KEY ("usuario_responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_aberta_por_id_fkey" FOREIGN KEY ("aberta_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordens_servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_avaliado_por_id_fkey" FOREIGN KEY ("avaliado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =============================================================
-- [SQL MANUAL] Regras de integridade que o Prisma não expressa
-- =============================================================

-- RN03: no máximo UMA OS não encerrada por veículo.
CREATE UNIQUE INDEX "ordens_servico_veiculo_ativa_key"
  ON "ordens_servico" ("veiculo_id")
  WHERE "status" NOT IN ('ENTREGUE', 'CANCELADA');

-- ADR-01: ordem única entre os modelos de etapa ATIVOS.
CREATE UNIQUE INDEX "modelos_etapa_ordem_ativo_key"
  ON "modelos_etapa" ("ordem")
  WHERE "ativo" = true;

-- Perfil CLIENTE <=> vinculado a um cliente.
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cliente_perfil_chk"
  CHECK (("perfil" = 'CLIENTE') = ("cliente_id" IS NOT NULL));

-- RN33: CPF (11) ou CNPJ (14), somente dígitos, coerente com o tipo de pessoa.
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_cpf_cnpj_chk"
  CHECK (
    ("tipo_pessoa" = 'FISICA'   AND "cpf_cnpj" ~ '^[0-9]{11}$') OR
    ("tipo_pessoa" = 'JURIDICA' AND "cpf_cnpj" ~ '^[0-9]{14}$')
  );

-- RN34: placa (antiga ou Mercosul) e chassi (VIN sem I, O, Q) normalizados.
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_placa_chk"
  CHECK ("placa" ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$');
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_chassi_chk"
  CHECK ("chassi" ~ '^[A-HJ-NPR-Z0-9]{17}$');
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_anos_chk"
  CHECK ("ano_fabricacao" BETWEEN 1950 AND 2100 AND "ano_modelo" BETWEEN "ano_fabricacao" AND "ano_fabricacao" + 1);

-- RN10: etapa em andamento precisa de responsável.
-- RN11: etapa CONCLUIDA tem data de conclusão; nas demais (inclusive reaberta) ela é limpa.
ALTER TABLE "etapas_processo" ADD CONSTRAINT "etapas_responsavel_em_andamento_chk"
  CHECK ("status" <> 'EM_ANDAMENTO' OR "responsavel_id" IS NOT NULL);
ALTER TABLE "etapas_processo" ADD CONSTRAINT "etapas_data_conclusao_chk"
  CHECK (("status" = 'CONCLUIDA') = ("data_conclusao" IS NOT NULL));
ALTER TABLE "etapas_processo" ADD CONSTRAINT "etapas_datas_coerentes_chk"
  CHECK ("data_conclusao" IS NULL OR "data_inicio" IS NULL OR "data_conclusao" >= "data_inicio");

-- RN06: OS entregue tem data de entrega, e somente ela.
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_data_entrega_chk"
  CHECK (("status" = 'ENTREGUE') = ("data_entrega" IS NOT NULL));

-- RN21: ocorrência resolvida tem data de resolução e solução.
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_resolucao_chk"
  CHECK (
    ("status" = 'RESOLVIDA') = ("data_resolucao" IS NOT NULL)
    AND ("status" <> 'RESOLVIDA' OR "solucao" IS NOT NULL)
  );

-- Documento avaliado registra quem e quando; rejeitado registra o motivo.
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_avaliacao_chk"
  CHECK (
    ("status" = 'PENDENTE') = ("avaliado_por_id" IS NULL AND "avaliado_em" IS NULL)
    AND ("status" <> 'REJEITADO' OR "motivo_rejeicao" IS NOT NULL)
  );
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tamanho_chk"
  CHECK ("tamanho_bytes" > 0);

-- =============================================================
-- [SQL MANUAL] Tabelas append-only (RN28 / ADR-04)
-- Bloqueia UPDATE e DELETE mesmo fora da aplicação.
-- TRUNCATE não é bloqueado de propósito: é usado pela limpeza dos testes e,
-- em produção, o papel da aplicação não deve ter esse privilégio.
-- =============================================================
CREATE FUNCTION impedir_alteracao_registro_imutavel() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Tabela "%" é somente de inserção: % não permitido', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "historico_status_imutavel"
  BEFORE UPDATE OR DELETE ON "historico_status"
  FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_registro_imutavel();

CREATE TRIGGER "auditoria_imutavel"
  BEFORE UPDATE OR DELETE ON "auditoria"
  FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_registro_imutavel();

CREATE TRIGGER "alteracoes_previsao_imutavel"
  BEFORE UPDATE OR DELETE ON "alteracoes_previsao"
  FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_registro_imutavel();
