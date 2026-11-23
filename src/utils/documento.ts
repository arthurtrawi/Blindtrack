/**
 * Validação e formatação de CPF e CNPJ (RN33).
 *
 * CNPJ: a partir de julho/2026 a Receita Federal emite também CNPJ ALFANUMÉRICO
 * (IN RFB 2.229/2024): 12 caracteres [0-9A-Z] + 2 dígitos verificadores numéricos.
 * O cálculo do DV é o mesmo módulo 11, usando o valor (código ASCII − 48) de cada caractere.
 * Para CNPJs só numéricos, o resultado é idêntico ao algoritmo tradicional.
 */

/** Remove pontuação e espaços e converte para maiúsculas: "529.982.247-25" → "52998224725". */
export function normalizarDocumento(valor: string): string {
  return valor.replace(/[.\-/\s]/g, '').toUpperCase();
}

export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digitos = cpf.split('').map(Number);

  for (const posicao of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < posicao; i++) {
      soma += (digitos[i] ?? 0) * (posicao + 1 - i);
    }
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== digitos[posicao]) return false;
  }
  return true;
}

const PESOS_CNPJ_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_DV2 = [6, ...PESOS_CNPJ_DV1];

export function cnpjValido(cnpj: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const valores = cnpj.split('').map((c) => c.charCodeAt(0) - 48);

  const calcularDv = (pesos: number[]): number => {
    const soma = pesos.reduce((acc, peso, i) => acc + peso * (valores[i] ?? 0), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcularDv(PESOS_CNPJ_DV1) === valores[12] && calcularDv(PESOS_CNPJ_DV2) === valores[13];
}

/** Tipo de pessoa correspondente a um documento já normalizado e válido. */
export function tipoPessoaDoDocumento(documento: string): 'FISICA' | 'JURIDICA' | null {
  if (documento.length === 11 && cpfValido(documento)) return 'FISICA';
  if (documento.length === 14 && cnpjValido(documento)) return 'JURIDICA';
  return null;
}

/**
 * Mascara o documento para perfis que não precisam do valor completo (LGPD, minimização).
 * CPF 52998224725 → ***.982.247-** | CNPJ 11222333000181 → **.222.333/0001-**
 */
export function mascararDocumento(documento: string): string {
  if (documento.length === 11) {
    return `***.${documento.slice(3, 6)}.${documento.slice(6, 9)}-**`;
  }
  if (documento.length === 14) {
    return `**.${documento.slice(2, 5)}.${documento.slice(5, 8)}/${documento.slice(8, 12)}-**`;
  }
  return '***';
}
