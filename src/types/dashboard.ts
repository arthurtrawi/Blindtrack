import type { DataISO } from './api';
import type { StatusOrdemServico } from './ordemServico';

/** GET /dashboard/indicadores (backend: services/dashboard.service.ts) */
export interface IndicadoresDashboard {
  porStatus: Record<StatusOrdemServico, number>;
  ordensAtivas: number;
  ordensAtrasadas: number;
  entregasProximos7Dias: number;
  ocorrenciasAtivas: number;
  etapasEmCurso: number;
  etapasAtrasadas: number;
  geradoEm: DataISO;
}

/** GET /health */
export interface StatusSaude {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: DataISO;
}
