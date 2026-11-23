/**
 * Upload de um único arquivo no campo "arquivo" (multipart/form-data).
 * Fica em memória (limitado a UPLOAD_MAX_SIZE_MB): o storage.service verifica a
 * assinatura binária ANTES de qualquer gravação em disco.
 */
import multer from 'multer';
import { env } from '../config/env.js';

export const uploadArquivo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
    files: 1,
    fields: 10,
    fieldSize: 10 * 1024,
  },
}).single('arquivo');
