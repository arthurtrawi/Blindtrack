/**
 * Schemas Zod reutilizáveis por vários módulos.
 */
import { z } from 'zod';
import { normalizarDocumento, tipoPessoaDoDocumento } from '../utils/documento.js';

export const idParamSchema = z.strictObject({
  id: z.uuid('Identificador inválido'),
});
export type IdParam = z.infer<typeof idParamSchema>;

export const paginacaoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Booleano vindo da query string ("true" / "false"). */
export const booleanoQuerySchema = z
  .enum(['true', 'false'], 'Use true ou false')
  .transform((valor) => valor === 'true');

/** E-mail normalizado (trim + minúsculas). */
export const emailSchema = z
  .string('E-mail é obrigatório')
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('E-mail inválido'));

/**
 * Senha: 10 a 72 bytes (o bcrypt ignora o que passa de 72 bytes), com pelo menos uma
 * letra e um número.
 */
export const senhaSchema = z
  .string('Senha é obrigatória')
  .min(10, 'A senha deve ter pelo menos 10 caracteres')
  .refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'A senha deve ter no máximo 72 bytes')
  .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), 'A senha deve conter letras e números');

/** CPF ou CNPJ (numérico ou alfanumérico), normalizado e com dígitos verificadores válidos. */
export const documentoSchema = z
  .string('CPF/CNPJ é obrigatório')
  .transform(normalizarDocumento)
  .refine((doc) => tipoPessoaDoDocumento(doc) !== null, 'CPF/CNPJ inválido');

/** Telefone brasileiro com DDD: 10 ou 11 dígitos (aceita +55 e pontuação). */
export const telefoneSchema = z
  .string('Telefone é obrigatório')
  .transform((v) => {
    const digitos = v.replace(/\D/g, '');
    return digitos.length > 11 && digitos.startsWith('55') ? digitos.slice(2) : digitos;
  })
  .refine((v) => /^\d{10,11}$/.test(v), 'Telefone deve ter DDD + número (10 ou 11 dígitos)');

export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export const ufSchema = z.string().trim().toUpperCase().pipe(z.enum(UFS, 'UF inválida'));

export const cepSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => /^\d{8}$/.test(v), 'CEP deve ter 8 dígitos');

/** Texto obrigatório com trim e limites. */
export const textoSchema = (min: number, max: number, campo: string) =>
  z
    .string(`${campo} é obrigatório(a)`)
    .trim()
    .min(min, `${campo} deve ter pelo menos ${min} caracteres`)
    .max(max, `${campo} deve ter no máximo ${max} caracteres`);
