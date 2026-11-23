import { Badge } from '@/components/ui/Badge';
import type { StatusOrdemServico } from '@/types/ordemServico';
import { ATRASO, STATUS_OS } from '@/utils/status';

export function StatusOsBadge({ status }: { status: StatusOrdemServico }) {
  const { rotulo, tom, icone } = STATUS_OS[status];
  return <Badge tom={tom} texto={rotulo} icone={icone} />;
}

export function AtrasoBadge() {
  return <Badge tom={ATRASO.tom} texto={ATRASO.rotulo} icone={ATRASO.icone} />;
}
