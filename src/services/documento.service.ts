/**
 * Documentos da OS (RF34–RF37).
 * Aprovar ou rejeitar é uma DECISÃO HUMANA registrada (RN00): o sistema não valida
 * conteúdo técnico nem legal dos documentos.
 */
import { prisma } from '../config/prisma.js';
import type { Documento, Prisma } from '../generated/prisma/client.js';
import type { ContextoRequisicao } from '../types/auth.js';
import { BusinessRuleError, NotFoundError } from '../utils/app-error.js';
import type { AvaliarDocumentoInput, EnviarDocumentoInput } from '../validators/documento.schema.js';
import { registrarAuditoria } from './auditoria.service.js';
import { registrarHistorico } from './historico.service.js';
import { buscarOrdemOperavel } from './ordem-servico.service.js';
import { caminhoAbsoluto, removerArquivo, salvarArquivo } from './storage.service.js';

const documentoInclude = {
  enviadoPor: { select: { id: true, nome: true } },
  avaliadoPor: { select: { id: true, nome: true } },
} as const satisfies Prisma.DocumentoInclude;

export interface ArquivoRecebido {
  buffer: Buffer;
  originalname: string;
}

/** Nome original só para exibição/download: sem caminhos nem caracteres de controle. */
function sanitizarNomeOriginal(nome: string): string {
  const base = nome.split(/[\\/]/).pop() ?? 'arquivo';
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\u0000-\u001f\u007f"]/g, '').slice(0, 255) || 'arquivo';
}

export async function enviarDocumento(
  ordemServicoId: string,
  arquivo: ArquivoRecebido | undefined,
  dados: EnviarDocumentoInput,
  ctx: ContextoRequisicao,
) {
  if (!arquivo) throw new BusinessRuleError('Envie o arquivo no campo "arquivo"', 'ARQUIVO_AUSENTE');
  await buscarOrdemOperavel(prisma, ordemServicoId, { permitirSuspensa: true });

  const salvo = await salvarArquivo(arquivo.buffer);
  try {
    return await prisma.$transaction(async (tx) => {
      await buscarOrdemOperavel(tx, ordemServicoId, { permitirSuspensa: true });
      const documento = await tx.documento.create({
        data: {
          ordemServicoId,
          nome: dados.nome,
          tipo: dados.tipo,
          visivelCliente: dados.visivelCliente,
          caminhoArquivo: salvo.chave,
          nomeOriginal: sanitizarNomeOriginal(arquivo.originalname),
          mimeType: salvo.mimeType,
          tamanhoBytes: salvo.tamanhoBytes,
          hashSha256: salvo.hashSha256,
          enviadoPorId: ctx.usuario.id,
        },
        include: documentoInclude,
      });
      await registrarHistorico(tx, ctx, {
        ordemServicoId,
        documentoId: documento.id,
        tipoEvento: 'DOCUMENTO',
        statusAnterior: null,
        statusNovo: 'PENDENTE',
        descricao: `Documento enviado: ${dados.nome} (${dados.tipo})`,
        visivelCliente: dados.visivelCliente,
      });
      const { enviadoPor: _e, avaliadoPor: _a, ...dadosAuditoria } = documento;
      await registrarAuditoria(tx, ctx, {
        entidade: 'Documento',
        entidadeId: documento.id,
        acao: 'CRIAR',
        depois: dadosAuditoria,
      });
      return documento;
    });
  } catch (erro) {
    // Compensação: sem registro no banco, o arquivo não deve ficar órfão no disco.
    await removerArquivo(salvo.chave);
    throw erro;
  }
}

export async function listarDocumentos(ordemServicoId: string) {
  const ordem = await prisma.ordemServico.findUnique({ where: { id: ordemServicoId }, select: { id: true } });
  if (!ordem) throw new NotFoundError('Ordem de serviço');
  return prisma.documento.findMany({
    where: { ordemServicoId },
    include: documentoInclude,
    orderBy: { createdAt: 'desc' },
  });
}

export async function avaliarDocumento(id: string, dados: AvaliarDocumentoInput, ctx: ContextoRequisicao) {
  const documento = await prisma.documento.findUnique({ where: { id } });
  if (!documento) throw new NotFoundError('Documento');
  if (documento.status !== 'PENDENTE') {
    throw new BusinessRuleError(
      'Documento já avaliado. Para substituir, envie uma nova versão.',
      'DOCUMENTO_JA_AVALIADO',
    );
  }

  return prisma.$transaction(async (tx) => {
    await buscarOrdemOperavel(tx, documento.ordemServicoId, { permitirSuspensa: true });
    const { count } = await tx.documento.updateMany({
      where: { id, status: 'PENDENTE' },
      data: {
        status: dados.status,
        avaliadoPorId: ctx.usuario.id,
        avaliadoEm: new Date(),
        motivoRejeicao: dados.status === 'REJEITADO' ? (dados.motivoRejeicao ?? null) : null,
      },
    });
    if (count === 0)
      throw new BusinessRuleError('Documento já avaliado por outra pessoa', 'DOCUMENTO_JA_AVALIADO');

    await registrarHistorico(tx, ctx, {
      ordemServicoId: documento.ordemServicoId,
      documentoId: id,
      tipoEvento: 'DOCUMENTO',
      statusAnterior: 'PENDENTE',
      statusNovo: dados.status,
      descricao: `Documento ${documento.nome} ${dados.status === 'APROVADO' ? 'aprovado' : `rejeitado: ${dados.motivoRejeicao}`}`,
      visivelCliente: documento.visivelCliente,
    });
    await registrarAuditoria(tx, ctx, {
      entidade: 'Documento',
      entidadeId: id,
      acao: 'ALTERAR_STATUS',
      antes: { status: 'PENDENTE' },
      depois: { status: dados.status, motivoRejeicao: dados.motivoRejeicao },
    });
    return tx.documento.findUniqueOrThrow({ where: { id }, include: documentoInclude });
  });
}

export interface ArquivoParaDownload {
  caminho: string;
  nomeOriginal: string;
  mimeType: string;
}

function paraDownload(
  documento: Pick<Documento, 'caminhoArquivo' | 'nomeOriginal' | 'mimeType'>,
): ArquivoParaDownload {
  return {
    caminho: caminhoAbsoluto(documento.caminhoArquivo),
    nomeOriginal: documento.nomeOriginal,
    mimeType: documento.mimeType,
  };
}

/** Download pelo painel interno. */
export async function obterArquivo(id: string): Promise<ArquivoParaDownload> {
  const documento = await prisma.documento.findUnique({ where: { id } });
  if (!documento) throw new NotFoundError('Documento');
  return paraDownload(documento);
}

/** Download pelo portal: só documentos visíveis de OS do próprio cliente; senão 404 (ADR-07). */
export async function obterArquivoDoCliente(id: string, clienteId: string): Promise<ArquivoParaDownload> {
  const documento = await prisma.documento.findFirst({
    where: { id, visivelCliente: true, ordemServico: { clienteId } },
  });
  if (!documento) throw new NotFoundError('Documento');
  return paraDownload(documento);
}
