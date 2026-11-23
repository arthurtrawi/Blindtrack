import { z } from 'zod';
import { textoSchema } from './comum.schema.js';

const codigoSchema = z
  .string('codigo é obrigatório')
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9_]{1,39}$/, 'codigo: letras maiúsculas, números e _ (2 a 40 caracteres)');

const ordemSchema = z.number('ordem deve ser numérica').int().min(1).max(32_000);

export const criarModeloEtapaSchema = z.strictObject({
  codigo: codigoSchema,
  nome: textoSchema(2, 80, 'Nome'),
  descricao: z.string().trim().max(2000).optional(),
  ordem: ordemSchema,
  obrigatoria: z.boolean().default(true),
});
export type CriarModeloEtapaInput = z.infer<typeof criarModeloEtapaSchema>;

/** O código é imutável: ele é a chave usada pelas regras (ex.: ENTREGA). */
export const atualizarModeloEtapaSchema = z
  .strictObject({
    nome: textoSchema(2, 80, 'Nome').optional(),
    descricao: z.string().trim().max(2000).nullable().optional(),
    ordem: ordemSchema.optional(),
    obrigatoria: z.boolean().optional(),
    ativo: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Informe ao menos um campo para atualizar');
export type AtualizarModeloEtapaInput = z.infer<typeof atualizarModeloEtapaSchema>;
