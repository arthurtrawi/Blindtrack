/** Dados de exemplo no formato REAL das respostas do portal (backend: portal.service.ts). */
import type { StatusEtapa } from '@/types/ordemServico';
import type { EtapaPortal, OrdemPortalDetalhe, OrdemPortalResumo } from '@/types/portal';

const NOMES = [
  'Recepção',
  'Desmontagem',
  'Instalação da manta',
  'Troca de vidros',
  'Remontagem',
  'Vistoria',
  'Inspeção final',
  'Entrega',
];

const ROTULOS: Record<StatusEtapa, string> = {
  PENDENTE: 'Aguardando',
  EM_ANDAMENTO: 'Em andamento',
  PAUSADA: 'Pausada',
  CONCLUIDA: 'Concluída',
  DISPENSADA: 'Não se aplica',
};

export function etapas(...status: StatusEtapa[]): EtapaPortal[] {
  return status.map((s, i) => ({
    nome: NOMES[i] ?? `Etapa ${i + 1}`,
    descricao: `Descrição da etapa ${NOMES[i] ?? i + 1}.`,
    ordem: (i + 1) * 10,
    status: s,
    statusDescricao: ROTULOS[s],
    dataInicio: s === 'PENDENTE' || s === 'DISPENSADA' ? null : '2026-11-18T12:00:00.000Z',
    previsaoConclusao: '2099-12-01T12:00:00.000Z',
    dataConclusao: s === 'CONCLUIDA' ? '2026-11-19T12:00:00.000Z' : null,
  }));
}

export function resumo(parcial: Partial<OrdemPortalResumo> = {}): OrdemPortalResumo {
  return {
    id: 'os-1',
    numero: 'OS-2026-000001',
    status: 'EM_ANDAMENTO',
    statusDescricao: 'Em andamento',
    dataEntrada: '2026-11-18T12:00:00.000Z',
    previsaoEntrega: '2026-12-23T12:00:00.000Z',
    dataEntrega: null,
    atrasada: false,
    veiculo: { placa: 'BRA2E19', marca: 'Toyota', modelo: 'Corolla Cross', cor: 'Preto' },
    etapaAtual: 'Desmontagem',
    progresso: { concluidas: 1, total: 8 },
    ...parcial,
  };
}

export function detalhe(parcial: Partial<OrdemPortalDetalhe> = {}): OrdemPortalDetalhe {
  return {
    id: 'os-1',
    numero: 'OS-2026-000001',
    status: 'EM_ANDAMENTO',
    statusDescricao: 'Em andamento',
    dataEntrada: '2026-11-18T12:00:00.000Z',
    previsaoEntrega: '2026-12-23T12:00:00.000Z',
    dataEntrega: null,
    atrasada: false,
    veiculo: { placa: 'BRA2E19', marca: 'Toyota', modelo: 'Corolla Cross', cor: 'Preto', anoModelo: 2026 },
    etapas: etapas(
      'CONCLUIDA',
      'EM_ANDAMENTO',
      'PENDENTE',
      'DISPENSADA',
      'PENDENTE',
      'PENDENTE',
      'PENDENTE',
      'PENDENTE',
    ),
    ocorrencias: [
      {
        descricao: 'Aguardando material de um fornecedor.',
        status: 'Em análise',
        dataAbertura: '2026-11-21T12:00:00.000Z',
        dataResolucao: null,
      },
    ],
    documentos: [
      {
        id: 'doc-1',
        nome: 'Contrato assinado',
        tipo: 'CONTRATO',
        createdAt: '2026-11-20T12:00:00.000Z',
        download: '/api/v1/cliente/documentos/doc-1/arquivo',
      },
    ],
    linhaDoTempo: [
      { data: '2026-11-18T12:00:00.000Z', mensagem: 'Veículo recebido e ordem de serviço aberta' },
      { data: '2026-11-21T15:30:00.000Z', mensagem: 'Desmontagem: Em andamento' },
    ],
    ...parcial,
  };
}

export function paginado<T>(data: T[]) {
  return { data, meta: { page: 1, pageSize: 100, total: data.length, totalPages: 1 } };
}
