/**
 * Tratamento global de erros (RNF16).
 * Converte qualquer erro num corpo padronizado:
 *   { "error": { "code", "message", "details?", "requestId" } }
 * Erros inesperados viram 500 sem expor stack trace nem mensagens internas ao cliente.
 */
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../utils/app-error.js';

interface CorpoErro {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

/** Traduz erros conhecidos do Prisma em erros de domínio. */
function traduzirErroPrisma(erro: Prisma.PrismaClientKnownRequestError): AppError | null {
  switch (erro.code) {
    case 'P2002': {
      const alvo = erro.meta?.['target'];
      return new ConflictError('Registro duplicado: valor já cadastrado', { campos: alvo });
    }
    case 'P2025':
      return new NotFoundError('Registro');
    case 'P2003':
      return new ConflictError('Operação viola integridade referencial');
    default:
      return null;
  }
}

function normalizarErro(erro: unknown): AppError | null {
  if (erro instanceof AppError) return erro;

  if (erro instanceof ZodError) {
    return new ValidationError(
      erro.issues.map((issue) => ({ campo: issue.path.join('.'), mensagem: issue.message })),
    );
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    return traduzirErroPrisma(erro);
  }

  // JSON malformado no corpo da requisição (express.json).
  if (erro instanceof SyntaxError && 'status' in erro && (erro as { status: number }).status === 400) {
    return new AppError('JSON malformado no corpo da requisição', 400, 'INVALID_JSON');
  }

  // Corpo acima do limite configurado.
  if (typeof erro === 'object' && erro !== null && (erro as { type?: string }).type === 'entity.too.large') {
    return new AppError('Corpo da requisição excede o tamanho permitido', 413, 'PAYLOAD_TOO_LARGE');
  }

  return null;
}

export function errorHandler(erro: unknown, req: Request, res: Response, _next: NextFunction): void {
  const appError = normalizarErro(erro);
  const requestId = typeof req.id === 'string' ? req.id : undefined;

  if (appError) {
    if (appError.statusCode >= 500) {
      req.log.error({ err: erro }, appError.message);
    }
    const corpo: CorpoErro = {
      error: { code: appError.code, message: appError.message, requestId },
    };
    if (appError.details !== undefined) corpo.error.details = appError.details;
    res.status(appError.statusCode).json(corpo);
    return;
  }

  req.log.error({ err: erro }, 'Erro não tratado');
  const corpo: CorpoErro = {
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Erro interno do servidor', requestId },
  };
  res.status(500).json(corpo);
}
