import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service.js';

/** GET /dashboard/indicadores */
export async function indicadores(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await dashboardService.indicadores() });
}
