/** Dados de exemplo no formato REAL das respostas do painel (backend: ordem-servico.service.ts). */
import type { InfoPrazo } from '@/types/api';
import type { Etapa, OrdemServicoDetalhe, OrdemServicoResumo, StatusEtapa } from '@/types/ordemServico';

export const prazoEmDia: InfoPrazo = {
  previsto: '2099-12-01T12:00:00.000Z',
  realizado: null,
  atrasada: false,
  diasAtraso: 0,
  desvioDias: null,
};

const CODIGOS = [
  'RECEPCAO',
  'DESMONTAGEM',
  'INSTALACAO_MANTA',
  'TROCA_VIDROS',
  'REMONTAGEM',
  'VISTORIA',
  'INSPECAO_FINAL',
  'ENTREGA',
];
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

export function etapaPainel(
  indice: number,
  status: StatusEtapa,
  responsavel: { id: string; nome: string } | null = null,
): Etapa {
  return {
    id: `etapa-${indice + 1}`,
    ordemServicoId: 'os-1',
    modeloEtapaId: null,
    codigo: CODIGOS[indice] ?? `E${indice}`,
    nome: NOMES[indice] ?? `Etapa ${indice + 1}`,
    descricao: null,
    ordem: (indice + 1) * 10,
    obrigatoria: CODIGOS[indice] !== 'TROCA_VIDROS',
    status,
    responsavelId: responsavel?.id ?? null,
    dataInicio: status === 'PENDENTE' || status === 'DISPENSADA' ? null : '2026-11-18T12:00:00.000Z',
    previsaoConclusao: null,
    dataConclusao: status === 'CONCLUIDA' ? '2026-11-19T12:00:00.000Z' : null,
    createdAt: '2026-11-18T12:00:00.000Z',
    updatedAt: '2026-11-18T12:00:00.000Z',
    responsavel,
    prazo: prazoEmDia,
  };
}

export function ordemDetalhe(parcial: Partial<OrdemServicoDetalhe> = {}): OrdemServicoDetalhe {
  return {
    id: 'os-1',
    numero: 'OS-2026-000001',
    veiculoId: 'veiculo-1',
    clienteId: 'cliente-1',
    status: 'EM_ANDAMENTO',
    dataEntrada: '2026-11-18T12:00:00.000Z',
    previsaoEntrega: '2026-12-23T12:00:00.000Z',
    dataEntrega: null,
    observacoes: 'Cliente pediu urgência',
    abertaPorId: 'id-atendimento',
    createdAt: '2026-11-18T12:00:00.000Z',
    updatedAt: '2026-11-18T12:00:00.000Z',
    cliente: { id: 'cliente-1', nome: 'Maria Souza' },
    veiculo: {
      id: 'veiculo-1',
      placa: 'BRA2E19',
      chassi: '9BWZZZ377VT004251',
      marca: 'Toyota',
      modelo: 'Corolla Cross',
      cor: 'Preto',
    },
    abertaPor: { id: 'id-atendimento', nome: 'Atendimento' },
    etapas: [
      etapaPainel(0, 'CONCLUIDA', { id: 'id-tecnico', nome: 'Técnico Um' }),
      etapaPainel(1, 'PENDENTE', { id: 'id-tecnico', nome: 'Técnico Um' }),
      etapaPainel(2, 'PENDENTE'),
    ],
    prazo: prazoEmDia,
    ocorrenciasAbertas: 0,
    totalDocumentos: 0,
    ...parcial,
  };
}

export function ordemResumo(parcial: Partial<OrdemServicoResumo> = {}): OrdemServicoResumo {
  return {
    id: 'os-1',
    numero: 'OS-2026-000001',
    veiculoId: 'veiculo-1',
    clienteId: 'cliente-1',
    status: 'EM_ANDAMENTO',
    dataEntrada: '2026-11-18T12:00:00.000Z',
    previsaoEntrega: '2026-12-23T12:00:00.000Z',
    dataEntrega: null,
    observacoes: null,
    abertaPorId: 'id-atendimento',
    createdAt: '2026-11-18T12:00:00.000Z',
    updatedAt: '2026-11-18T12:00:00.000Z',
    cliente: { id: 'cliente-1', nome: 'Maria Souza' },
    veiculo: { id: 'veiculo-1', placa: 'BRA2E19', marca: 'Toyota', modelo: 'Corolla Cross' },
    etapaAtual: {
      nome: 'Desmontagem',
      status: 'EM_ANDAMENTO',
      responsavel: { id: 'id-tecnico', nome: 'Técnico Um' },
    },
    ocorrenciasAbertas: 0,
    prazo: prazoEmDia,
    ...parcial,
  };
}
