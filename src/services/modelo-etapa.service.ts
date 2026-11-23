/**
 * Modelo configurável de etapas (RF23, ADR-01).
 * Alterações valem só para NOVAS OS: as OS já abertas têm cópia própria das etapas (RN04).
 * Modelos não são excluídos, apenas desativados.
 */
import { prisma } from '../config/prisma.js';
import type { ModeloEtapa } from '../generated/prisma/client.js';
import type { ContextoRequisicao } from '../types/auth.js';
import { BusinessRuleError, ConflictError, NotFoundError } from '../utils/app-error.js';
import type { AtualizarModeloEtapaInput, CriarModeloEtapaInput } from '../validators/modelo-etapa.schema.js';
import { diferencas, registrarAuditoria } from './auditoria.service.js';
import { CODIGO_ETAPA_ENTREGA, CODIGOS_ETAPAS_SEMPRE_OBRIGATORIAS } from './domain/constantes.js';

const sempreObrigatoria = (codigo: string): boolean =>
  (CODIGOS_ETAPAS_SEMPRE_OBRIGATORIAS as readonly string[]).includes(codigo);

/** Confere a configuração resultante: ordem única, ENTREGA ativa e por último. */
async function validarConfiguracao(
  modelo: Pick<ModeloEtapa, 'codigo' | 'ordem' | 'ativo'> & { id?: string },
): Promise<void> {
  if (!modelo.ativo) return;

  const conflito = await prisma.modeloEtapa.findFirst({
    where: { ativo: true, ordem: modelo.ordem, ...(modelo.id && { NOT: { id: modelo.id } }) },
    select: { codigo: true },
  });
  if (conflito) throw new ConflictError(`A ordem ${modelo.ordem} já é usada pela etapa ${conflito.codigo}`);

  const entrega = await prisma.modeloEtapa.findUnique({ where: { codigo: CODIGO_ETAPA_ENTREGA } });
  const ordemEntrega = modelo.codigo === CODIGO_ETAPA_ENTREGA ? modelo.ordem : entrega?.ordem;
  if (ordemEntrega !== undefined) {
    const depoisDaEntrega = await prisma.modeloEtapa.findFirst({
      where: {
        ativo: true,
        ordem: { gt: ordemEntrega },
        NOT: [...(modelo.id ? [{ id: modelo.id }] : []), { codigo: CODIGO_ETAPA_ENTREGA }],
      },
      select: { codigo: true },
    });
    const proprioDepois = modelo.codigo !== CODIGO_ETAPA_ENTREGA && modelo.ordem > ordemEntrega;
    if (depoisDaEntrega || proprioDepois) {
      throw new BusinessRuleError('A etapa ENTREGA deve ser a última etapa ativa', 'MODELO_ETAPAS_INVALIDO');
    }
  }
}

export async function listarModelos(): Promise<ModeloEtapa[]> {
  return prisma.modeloEtapa.findMany({ orderBy: [{ ativo: 'desc' }, { ordem: 'asc' }] });
}

export async function criarModelo(
  dados: CriarModeloEtapaInput,
  ctx: ContextoRequisicao,
): Promise<ModeloEtapa> {
  if (await prisma.modeloEtapa.findUnique({ where: { codigo: dados.codigo } })) {
    throw new ConflictError(`Já existe etapa com o código ${dados.codigo}`);
  }
  if (sempreObrigatoria(dados.codigo) && !dados.obrigatoria) {
    throw new BusinessRuleError(`A etapa ${dados.codigo} deve ser obrigatória`, 'RN13');
  }
  await validarConfiguracao({ codigo: dados.codigo, ordem: dados.ordem, ativo: true });

  return prisma.$transaction(async (tx) => {
    const modelo = await tx.modeloEtapa.create({ data: dados });
    await registrarAuditoria(tx, ctx, {
      entidade: 'ModeloEtapa',
      entidadeId: modelo.id,
      acao: 'CRIAR',
      depois: modelo,
    });
    return modelo;
  });
}

export async function atualizarModelo(
  id: string,
  dados: AtualizarModeloEtapaInput,
  ctx: ContextoRequisicao,
): Promise<ModeloEtapa> {
  const atual = await prisma.modeloEtapa.findUnique({ where: { id } });
  if (!atual) throw new NotFoundError('Modelo de etapa');

  if (sempreObrigatoria(atual.codigo) && (dados.obrigatoria === false || dados.ativo === false)) {
    throw new BusinessRuleError(`A etapa ${atual.codigo} é sempre obrigatória e ativa`, 'RN13');
  }
  await validarConfiguracao({
    id,
    codigo: atual.codigo,
    ordem: dados.ordem ?? atual.ordem,
    ativo: dados.ativo ?? atual.ativo,
  });

  return prisma.$transaction(async (tx) => {
    const modelo = await tx.modeloEtapa.update({ where: { id }, data: dados });
    const { antes, depois } = diferencas(atual, modelo);
    const acao =
      dados.ativo === false && atual.ativo
        ? 'INATIVAR'
        : dados.ativo && !atual.ativo
          ? 'REATIVAR'
          : 'ATUALIZAR';
    await registrarAuditoria(tx, ctx, { entidade: 'ModeloEtapa', entidadeId: id, acao, antes, depois });
    return modelo;
  });
}
