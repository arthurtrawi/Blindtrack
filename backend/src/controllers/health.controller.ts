import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { verificarSaude } from '../services/health.service.js';

export async function health(_req: Request, res: Response): Promise<void> {
  const saude = await verificarSaude(prisma);
  res.status(saude.database === 'up' ? 200 : 503).json(saude);
}
