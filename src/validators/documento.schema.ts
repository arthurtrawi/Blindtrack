import { z } from 'zod';
import { booleanoQuerySchema, textoSchema } from './comum.schema.js';

export const TIPOS_DOCUMENTO = [
  'CONTRATO',
  'CHECKLIST_VISTORIA',
  'DECLARACAO_BLINDAGEM',
  'TERMO_ENTREGA',
  'NOTA_FISCAL',
  'LAUDO_TECNICO',
  'FOTO',
  'OUTRO',
] as const;

/** Campos de texto do multipart/form-data (o arquivo vem em `arquivo`). */
export const enviarDocumentoSchema = z.strictObject({
  nome: textoSchema(3, 150, 'Nome'),
  tipo: z.enum(TIPOS_DOCUMENTO, `tipo deve ser um de: ${TIPOS_DOCUMENTO.join(', ')}`),
  /** Multipart envia texto: "true" / "false". */
  visivelCliente: booleanoQuerySchema.default(false),
});
export type EnviarDocumentoInput = z.infer<typeof enviarDocumentoSchema>;

export const avaliarDocumentoSchema = z
  .strictObject({
    status: z.enum(['APROVADO', 'REJEITADO'], 'status deve ser APROVADO ou REJEITADO'),
    motivoRejeicao: textoSchema(5, 1000, 'Motivo da rejeição').optional(),
  })
  .refine((d) => d.status !== 'REJEITADO' || Boolean(d.motivoRejeicao), {
    message: 'motivoRejeicao é obrigatório ao rejeitar',
    path: ['motivoRejeicao'],
  });
export type AvaliarDocumentoInput = z.infer<typeof avaliarDocumentoSchema>;
