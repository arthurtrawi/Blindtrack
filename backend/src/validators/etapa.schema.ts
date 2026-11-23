import { z } from 'zod';
import { ACOES_ETAPA } from '../services/domain/etapa.state-machine.js';
import { dataHoraSchema, justificativaSchema } from './comum.schema.js';

export const alterarStatusEtapaSchema = z.strictObject({
  acao: z.enum(ACOES_ETAPA, `acao deve ser uma de: ${ACOES_ETAPA.join(', ')}`),
  /** Obrigatória para PAUSAR, DISPENSAR e REABRIR (validado na máquina de estados). */
  justificativa: justificativaSchema.optional(),
});
export type AlterarStatusEtapaInput = z.infer<typeof alterarStatusEtapaSchema>;

export const atribuirResponsavelSchema = z.strictObject({
  responsavelId: z.uuid('responsavelId inválido'),
});
export type AtribuirResponsavelInput = z.infer<typeof atribuirResponsavelSchema>;

export const alterarPrazoEtapaSchema = z.strictObject({
  previsaoConclusao: dataHoraSchema,
  /** Obrigatória quando já existe previsão anterior (RN26). */
  justificativa: justificativaSchema.optional(),
});
export type AlterarPrazoEtapaInput = z.infer<typeof alterarPrazoEtapaSchema>;
