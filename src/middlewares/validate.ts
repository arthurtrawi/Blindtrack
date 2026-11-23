/**
 * Validação de entrada com Zod (RNF06).
 * Valida params, query e body antes do controller e SUBSTITUI os valores originais
 * pelos valores já validados e normalizados (trim, minúsculas, coerção de números...).
 * Campos não previstos são rejeitados pelos schemas strict (proteção contra mass assignment).
 * Um ZodError lançado aqui é convertido em 400 pelo errorHandler.
 */
import type { NextFunction, Request, Response } from 'express';
import type { z, ZodType } from 'zod';

interface SchemasRequisicao {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

export function validate(schemas: SchemasRequisicao) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as Request['params'];
    }
    if (schemas.query) {
      // No Express 5, req.query é um getter: redefinimos a propriedade na instância.
      Object.defineProperty(req, 'query', {
        value: schemas.query.parse(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body ?? {});
    }
    next();
  };
}

/**
 * Lê a query já validada pelo `validate({ query: schema })` da mesma rota.
 * O Express tipa `req.query` como ParsedQs e não aceita um tipo próprio na assinatura
 * do handler. Este helper concentra o único cast, amarrado ao tipo de saída do schema.
 */
export function queryValidada<S extends ZodType>(req: Request, _schema: S): z.output<S> {
  return req.query as z.output<S>;
}
