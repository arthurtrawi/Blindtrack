import { z } from 'zod';
import { emailSchema, senhaSchema } from './comum.schema.js';

export const loginSchema = z.strictObject({
  email: emailSchema,
  // No login não se aplica a política de senha: só se exige um valor (evita revelar regras).
  senha: z.string('Senha é obrigatória').min(1, 'Senha é obrigatória').max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const alterarSenhaSchema = z
  .strictObject({
    senhaAtual: z.string('Senha atual é obrigatória').min(1).max(200),
    novaSenha: senhaSchema,
  })
  .refine((d) => d.senhaAtual !== d.novaSenha, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['novaSenha'],
  });
export type AlterarSenhaInput = z.infer<typeof alterarSenhaSchema>;
