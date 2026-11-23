/**
 * Mapa único de status → rótulo, tom (cor) e ícone (planejamento §4).
 * Todo status aparece com TEXTO e ícone; a cor nunca é a única informação.
 */
import {
  AlarmClock,
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleDot,
  Loader,
  PackageCheck,
  PauseCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { TomBadge } from '@/components/ui/Badge';
import type { StatusEtapa, StatusOrdemServico, TipoDocumento } from '@/types/ordemServico';

export interface ApresentacaoStatus {
  rotulo: string;
  tom: TomBadge;
  icone: LucideIcon;
}

export const STATUS_OS: Record<StatusOrdemServico, ApresentacaoStatus> = {
  ABERTA: { rotulo: 'Aberta', tom: 'neutral', icone: CircleDot },
  EM_ANDAMENTO: { rotulo: 'Em andamento', tom: 'info', icone: Loader },
  SUSPENSA: { rotulo: 'Suspensa', tom: 'warning', icone: PauseCircle },
  PRONTA_PARA_ENTREGA: { rotulo: 'Pronta para entrega', tom: 'success', icone: PackageCheck },
  ENTREGUE: { rotulo: 'Entregue', tom: 'success', icone: CheckCircle2 },
  CANCELADA: { rotulo: 'Cancelada', tom: 'danger', icone: XCircle },
};

/** Rótulos do portal (cliente) e do painel diferem só em PENDENTE e DISPENSADA. */
export function statusEtapa(status: StatusEtapa, publico: 'cliente' | 'interno'): ApresentacaoStatus {
  const cliente = publico === 'cliente';
  switch (status) {
    case 'PENDENTE':
      return { rotulo: cliente ? 'Aguardando' : 'Pendente', tom: 'neutral', icone: Circle };
    case 'EM_ANDAMENTO':
      return { rotulo: 'Em andamento', tom: 'info', icone: Loader };
    case 'PAUSADA':
      return { rotulo: 'Pausada', tom: 'warning', icone: PauseCircle };
    case 'CONCLUIDA':
      return { rotulo: 'Concluída', tom: 'success', icone: CheckCircle2 };
    case 'DISPENSADA':
      return { rotulo: cliente ? 'Não se aplica' : 'Dispensada', tom: 'neutral', icone: CircleDashed };
  }
}

export const ATRASO: ApresentacaoStatus = { rotulo: 'Atrasada', tom: 'danger', icone: AlarmClock };

/** O portal recebe a situação da ocorrência já como texto (backend: portal.service). */
export function tomOcorrenciaPortal(situacao: string): TomBadge {
  switch (situacao) {
    case 'Resolvida':
      return 'success';
    case 'Encerrada':
      return 'neutral';
    case 'Em tratamento':
      return 'info';
    default:
      return 'warning'; // "Em análise" e qualquer texto novo: chama atenção, sem alarmar
  }
}

export const ROTULO_TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  CONTRATO: 'Contrato',
  CHECKLIST_VISTORIA: 'Checklist de vistoria',
  DECLARACAO_BLINDAGEM: 'Declaração de blindagem',
  TERMO_ENTREGA: 'Termo de entrega',
  NOTA_FISCAL: 'Nota fiscal',
  LAUDO_TECNICO: 'Laudo técnico',
  FOTO: 'Foto',
  OUTRO: 'Outro',
};

export const ROTULO_TIPO_OCORRENCIA = {
  AGUARDANDO_PECA: 'Aguardando peça',
  PENDENCIA_DOCUMENTAL: 'Pendência documental',
  RETRABALHO: 'Retrabalho',
  ATRASO: 'Atraso',
  OUTROS: 'Outros',
} as const;

export const ROTULO_PRIORIDADE = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
} as const;
