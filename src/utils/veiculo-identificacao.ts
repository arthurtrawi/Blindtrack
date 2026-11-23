/**
 * Normalização e validação de placa e chassi (RN34).
 * As mesmas regras existem como CHECK no banco. Aqui elas produzem mensagens claras.
 */

/** Placa antiga (ABC1234) ou Mercosul (ABC1D23), sem hífen e em maiúsculas. */
export const REGEX_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

/** VIN: 17 caracteres alfanuméricos, sem I, O e Q (ISO 3779). */
export const REGEX_CHASSI = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizarPlaca(valor: string): string {
  return valor.replace(/[-\s]/g, '').toUpperCase();
}

export function normalizarChassi(valor: string): string {
  return valor.replace(/\s/g, '').toUpperCase();
}
