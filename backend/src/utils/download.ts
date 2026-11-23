import type { Response } from 'express';
import type { ArquivoParaDownload } from '../services/documento.service.js';
import { NotFoundError } from './app-error.js';

/** Envia o arquivo como anexo (nunca renderizado inline pelo navegador). */
export async function enviarDownload(res: Response, arquivo: ArquivoParaDownload): Promise<void> {
  res.attachment(arquivo.nomeOriginal);
  res.type(arquivo.mimeType);
  res.setHeader('Cache-Control', 'private, no-store');
  await new Promise<void>((resolve, reject) => {
    res.sendFile(arquivo.caminho, { dotfiles: 'deny' }, (erro) => {
      if (!erro) return resolve();
      // Registro existe, mas o arquivo sumiu do disco: trata como não encontrado.
      reject('code' in erro && erro.code === 'ENOENT' ? new NotFoundError('Arquivo') : erro);
    });
  });
}
