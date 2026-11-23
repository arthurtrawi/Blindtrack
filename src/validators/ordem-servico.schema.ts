import { z } from 'zod';
import { ACOES_ORDEM } from '../services/domain/ordem-servico.state-machine.js';
import { normalizarPlaca } from '../utils/veiculo-identificacao.js';
import { booleanoQuerySchema, dataHoraSchema, justificativaSchema, paginacaoSchema } from './comum.schema.js';

const STATUS_OS = [
  'ABERTA',
  'EM_ANDAMENTO',
  'SUSPENSA',
  'PRONTA_PARA_ENTREGA',
  'ENTREGUE',
  'CANCELADA',
] as const;

export const abrirOrdemSchema = z.strictObject({
  clienteId: z.uuid('clienteId inválido'),
  veiculoId: z.uuid('veiculoId inválido'),
  previsaoEntrega: dataHoraSchema,
  observacoes: z.string().trim().max(5000).optional(),
});
export type AbrirOrdemInput = z.infer<typeof abrirOrdemSchema>;

/** Só dados não operacionais. Status e previsão têm endpoints próprios (com justificativa). */
export const atualizarOrdemSchema = z.strictObject({
  observacoes: z.string().trim().max(5000).nullable(),
});
export type AtualizarOrdemInput = z.infer<typeof atualizarOrdemSchema>;

export const alterarStatusOrdemSchema = z.strictObject({
  acao: z.enum(ACOES_ORDEM, `acao deve ser uma de: ${ACOES_ORDEM.join(', ')}`),
  justificativa: justificativaSchema,
});
export type AlterarStatusOrdemInput = z.infer<typeof alterarStatusOrdemSchema>;

export const alterarPrevisaoOrdemSchema = z.strictObject({
  previsaoEntrega: dataHoraSchema,
  justificativa: justificativaSchema,
});
export type AlterarPrevisaoOrdemInput = z.infer<typeof alterarPrevisaoOrdemSchema>;

export const listarOrdensSchema = paginacaoSchema
  .extend({
    status: z.enum(STATUS_OS, 'Status inválido').optional(),
    clienteId: z.uuid('clienteId inválido').optional(),
    veiculoId: z.uuid('veiculoId inválido').optional(),
    placa: z.string().transform(normalizarPlaca).optional(),
    numero: z.string().trim().toUpperCase().max(20).optional(),
    /** Somente OS atrasadas (RN27b). */
    atrasada: booleanoQuerySchema.optional(),
    /** Período de entrada (inclusive). */
    entradaDe: dataHoraSchema.optional(),
    entradaAte: dataHoraSchema.optional(),
  })
  .refine((q) => !q.entradaDe || !q.entradaAte || q.entradaDe <= q.entradaAte, {
    message: 'entradaDe deve ser anterior a entradaAte',
    path: ['entradaAte'],
  });
export type ListarOrdensQuery = z.infer<typeof listarOrdensSchema>;
