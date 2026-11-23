/**
 * Hierarquia de erros de domínio.
 * Os services lançam estes erros; o errorHandler global os converte em respostas HTTP.
 * Assim, nenhum controller decide status HTTP de erro manualmente.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Requisição inválida', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown, message = 'Dados de entrada inválidos') {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autenticado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(recurso = 'Recurso') {
    super(`${recurso} não encontrado(a)`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

/** Violação de regra de negócio (ex.: iniciar etapa com etapa anterior pendente). */
export class BusinessRuleError extends AppError {
  constructor(message: string, regra?: string, details?: unknown) {
    super(message, 422, regra ?? 'BUSINESS_RULE_VIOLATION', details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Serviço temporariamente indisponível') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}
