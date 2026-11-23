import { z } from 'zod';
import {
  booleanoQuerySchema,
  emailSchema,
  paginacaoSchema,
  senhaSchema,
  textoSchema,
} from './comum.schema.js';

const perfilSchema = z.enum(['ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO', 'CLIENTE'], 'Perfil inválido');

export const criarUsuarioSchema = z
  .strictObject({
    nome: textoSchema(3, 150, 'Nome'),
    email: emailSchema,
    senha: senhaSchema,
    perfil: perfilSchema,
    clienteId: z.uuid('clienteId inválido').optional(),
  })
  .superRefine((dados, ctx) => {
    if (dados.perfil === 'CLIENTE' && !dados.clienteId) {
      ctx.addIssue({
        code: 'custom',
        path: ['clienteId'],
        message: 'clienteId é obrigatório para o perfil CLIENTE',
      });
    }
    if (dados.perfil !== 'CLIENTE' && dados.clienteId) {
      ctx.addIssue({
        code: 'custom',
        path: ['clienteId'],
        message: 'clienteId só é permitido para o perfil CLIENTE',
      });
    }
  });
export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;

export const atualizarUsuarioSchema = z
  .strictObject({
    nome: textoSchema(3, 150, 'Nome').optional(),
    email: emailSchema.optional(),
    /** Redefinição de senha pelo ADMIN. */
    senha: senhaSchema.optional(),
    perfil: perfilSchema.optional(),
    ativo: z.boolean('ativo deve ser booleano').optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Informe ao menos um campo para atualizar');
export type AtualizarUsuarioInput = z.infer<typeof atualizarUsuarioSchema>;

export const listarUsuariosSchema = paginacaoSchema.extend({
  perfil: perfilSchema.optional(),
  ativo: booleanoQuerySchema.optional(),
  /** Busca parcial por nome ou e-mail. */
  busca: z.string().trim().min(2).max(100).optional(),
});
export type ListarUsuariosQuery = z.infer<typeof listarUsuariosSchema>;
