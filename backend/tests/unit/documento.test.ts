import { describe, expect, it } from 'vitest';
import {
  cnpjValido,
  cpfValido,
  mascararDocumento,
  normalizarDocumento,
  tipoPessoaDoDocumento,
} from '../../src/utils/documento.js';

describe('CPF', () => {
  it.each(['52998224725', '12345678909', '11144477735'])('aceita CPF válido %s', (cpf) => {
    expect(cpfValido(cpf)).toBe(true);
  });

  it.each([
    ['dígito verificador errado', '52998224726'],
    ['todos os dígitos iguais', '11111111111'],
    ['tamanho errado', '5299822472'],
    ['com letras', '5299822472A'],
  ])('rejeita CPF com %s', (_motivo, cpf) => {
    expect(cpfValido(cpf)).toBe(false);
  });
});

describe('CNPJ', () => {
  it('aceita CNPJ numérico válido', () => {
    expect(cnpjValido('11222333000181')).toBe(true);
  });

  it('aceita CNPJ alfanumérico válido (IN RFB 2.229/2024)', () => {
    expect(cnpjValido('12ABC34501DE35')).toBe(true);
  });

  it.each([
    ['DV numérico errado', '11222333000182'],
    ['DV alfanumérico errado', '12ABC34501DE36'],
    ['todos os dígitos iguais', '00000000000000'],
    ['letra na posição do DV', '12ABC34501DE3A'],
    ['minúsculas (não normalizado)', '12abc34501de35'],
  ])('rejeita CNPJ com %s', (_motivo, cnpj) => {
    expect(cnpjValido(cnpj)).toBe(false);
  });
});

describe('normalização, tipo e máscara', () => {
  it('remove pontuação e converte para maiúsculas', () => {
    expect(normalizarDocumento('529.982.247-25')).toBe('52998224725');
    expect(normalizarDocumento('12.abc.345/01de-35')).toBe('12ABC34501DE35');
  });

  it('identifica o tipo de pessoa pelo documento', () => {
    expect(tipoPessoaDoDocumento('52998224725')).toBe('FISICA');
    expect(tipoPessoaDoDocumento('11222333000181')).toBe('JURIDICA');
    expect(tipoPessoaDoDocumento('00000000000')).toBeNull();
  });

  it('mascara CPF e CNPJ mantendo só a parte central (LGPD)', () => {
    expect(mascararDocumento('52998224725')).toBe('***.982.247-**');
    expect(mascararDocumento('11222333000181')).toBe('**.222.333/0001-**');
  });
});
