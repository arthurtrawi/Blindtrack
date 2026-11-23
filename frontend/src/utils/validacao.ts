/**
 * Validações espelhadas do backend (src/utils/documento.ts, veiculo-identificacao.ts e
 * validators/comum.schema.ts). Dão retorno imediato no formulário; o backend valida de novo.
 */
import { z } from 'zod';

/** "529.982.247-25" → "52998224725"; CNPJ alfanumérico em maiúsculas. */
export function normalizarDocumento(valor: string): string {
  return valor.replace(/[.\-/\s]/g, '').toUpperCase();
}

export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const d = cpf.split('').map(Number);
  for (const posicao of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < posicao; i++) soma += (d[i] ?? 0) * (posicao + 1 - i);
    if (((soma * 10) % 11) % 10 !== d[posicao]) return false;
  }
  return true;
}

const PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_2 = [6, ...PESOS_1];

/** CNPJ numérico ou alfanumérico (IN RFB 2.229/2024): 12 caracteres [0-9A-Z] + 2 DVs. */
export function cnpjValido(cnpj: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const v = cnpj.split('').map((c) => c.charCodeAt(0) - 48);
  const dv = (pesos: number[]) => {
    const resto = pesos.reduce((acc, p, i) => acc + p * (v[i] ?? 0), 0) % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return dv(PESOS_1) === v[12] && dv(PESOS_2) === v[13];
}

export function tipoDoDocumento(documento: string): 'FISICA' | 'JURIDICA' | null {
  if (documento.length === 11 && cpfValido(documento)) return 'FISICA';
  if (documento.length === 14 && cnpjValido(documento)) return 'JURIDICA';
  return null;
}

export const REGEX_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
export const REGEX_CHASSI = /^[A-HJ-NPR-Z0-9]{17}$/;

export const normalizarPlaca = (v: string) => v.replace(/[-\s]/g, '').toUpperCase();
export const normalizarChassi = (v: string) => v.replace(/\s/g, '').toUpperCase();
export const somenteDigitos = (v: string) => v.replace(/\D/g, '');

// ----------------------------------------------------------------------------------------
// Peças de esquema Zod reutilizadas pelos formulários
// ----------------------------------------------------------------------------------------

export const campoTexto = (min: number, max: number, nome: string) =>
  z
    .string()
    .trim()
    .min(min, `${nome}: mínimo de ${min} caracteres`)
    .max(max, `${nome}: máximo de ${max} caracteres`);

export const campoEmail = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido'));

/** 10 a 72 bytes, com letras e números (regra do backend). */
export const campoSenha = z
  .string()
  .min(10, 'A senha deve ter pelo menos 10 caracteres')
  .refine((s) => new TextEncoder().encode(s).length <= 72, 'A senha deve ter no máximo 72 bytes')
  .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), 'A senha deve conter letras e números');

export const campoTelefone = z
  .string()
  .transform((v) => {
    const d = somenteDigitos(v);
    return d.length > 11 && d.startsWith('55') ? d.slice(2) : d;
  })
  .refine((v) => /^\d{10,11}$/.test(v), 'Telefone com DDD: 10 ou 11 dígitos');

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
