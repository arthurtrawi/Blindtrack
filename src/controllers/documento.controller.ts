import type { Request, Response } from 'express';
import * as documentoService from '../services/documento.service.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import { enviarDownload } from '../utils/download.js';
import type { IdParam } from '../validators/comum.schema.js';
import type { AvaliarDocumentoInput, EnviarDocumentoInput } from '../validators/documento.schema.js';

/** POST /ordens-servico/:id/documentos (multipart/form-data, campo "arquivo") */
export async function enviar(
  req: Request<IdParam, unknown, EnviarDocumentoInput>,
  res: Response,
): Promise<void> {
  const documento = await documentoService.enviarDocumento(
    req.params.id,
    req.file,
    req.body,
    contextoDe(req),
  );
  res.status(201).location(`/api/v1/documentos/${documento.id}`).json({ data: documento });
}

/** GET /ordens-servico/:id/documentos */
export async function listarDaOrdem(req: Request<IdParam>, res: Response): Promise<void> {
  res.status(200).json({ data: await documentoService.listarDocumentos(req.params.id) });
}

/** PATCH /documentos/:id/status */
export async function avaliar(
  req: Request<IdParam, unknown, AvaliarDocumentoInput>,
  res: Response,
): Promise<void> {
  res
    .status(200)
    .json({ data: await documentoService.avaliarDocumento(req.params.id, req.body, contextoDe(req)) });
}

/** GET /documentos/:id/arquivo */
export async function baixar(req: Request<IdParam>, res: Response): Promise<void> {
  await enviarDownload(res, await documentoService.obterArquivo(req.params.id));
}
