import type { Request, Response } from 'express';
import { queryValidada } from '../middlewares/validate.js';
import * as documentoService from '../services/documento.service.js';
import * as portalService from '../services/portal.service.js';
import { ForbiddenError } from '../utils/app-error.js';
import { contextoDe } from '../utils/contexto-requisicao.js';
import { enviarDownload } from '../utils/download.js';
import { paginacaoSchema, type IdParam } from '../validators/comum.schema.js';

export async function minhasOrdens(req: Request, res: Response): Promise<void> {
  res
    .status(200)
    .json(await portalService.minhasOrdens(contextoDe(req), queryValidada(req, paginacaoSchema)));
}

export async function acompanhar(req: Request<IdParam>, res: Response): Promise<void> {
  res.status(200).json({ data: await portalService.acompanharOrdem(req.params.id, contextoDe(req)) });
}

export async function baixarDocumento(req: Request<IdParam>, res: Response): Promise<void> {
  const { usuario } = contextoDe(req);
  if (!usuario.clienteId) throw new ForbiddenError('Acesso exclusivo do portal do cliente');
  await enviarDownload(res, await documentoService.obterArquivoDoCliente(req.params.id, usuario.clienteId));
}
