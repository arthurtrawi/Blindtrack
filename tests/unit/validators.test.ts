import { describe, expect, it } from 'vitest';
import { criarClienteSchema } from '../../src/validators/cliente.schema.js';
import { emailSchema, senhaSchema, telefoneSchema } from '../../src/validators/comum.schema.js';
import { criarUsuarioSchema } from '../../src/validators/usuario.schema.js';
import { atualizarVeiculoSchema, criarVeiculoSchema } from '../../src/validators/veiculo.schema.js';

const veiculoBase = {
  placa: 'abc-1d23',
  chassi: '9bwzzz377vt004251',
  marca: 'Toyota',
  modelo: 'Corolla',
  anoFabricacao: 2025,
  anoModelo: 2026,
  cor: 'Preto',
  clienteId: '01a206c8-1cc1-759a-8e13-ca9a3d8f8864',
};

describe('veículo', () => {
  it('normaliza placa e chassi', () => {
    const v = criarVeiculoSchema.parse(veiculoBase);
    expect(v.placa).toBe('ABC1D23');
    expect(v.chassi).toBe('9BWZZZ377VT004251');
  });

  it('rejeita chassi com letras proibidas (I, O, Q)', () => {
    expect(criarVeiculoSchema.safeParse({ ...veiculoBase, chassi: '9BWZZZ377VT00425O' }).success).toBe(false);
  });

  it('rejeita ano-modelo incoerente com o ano de fabricação', () => {
    expect(criarVeiculoSchema.safeParse({ ...veiculoBase, anoModelo: 2028 }).success).toBe(false);
    expect(criarVeiculoSchema.safeParse({ ...veiculoBase, anoModelo: 2024 }).success).toBe(false);
  });

  it('rejeita campos não previstos (mass assignment)', () => {
    expect(criarVeiculoSchema.safeParse({ ...veiculoBase, id: 'x' }).success).toBe(false);
  });

  it('exige ao menos um campo no PATCH', () => {
    expect(atualizarVeiculoSchema.safeParse({}).success).toBe(false);
  });
});

describe('cliente', () => {
  const clienteBase = {
    tipoPessoa: 'FISICA',
    nome: '  Maria Silva  ',
    cpfCnpj: '529.982.247-25',
    email: ' Maria@Exemplo.COM ',
    telefone: '+55 (11) 99999-0000',
  };

  it('normaliza documento, e-mail, nome e telefone', () => {
    const c = criarClienteSchema.parse(clienteBase);
    expect(c).toMatchObject({
      nome: 'Maria Silva',
      cpfCnpj: '52998224725',
      email: 'maria@exemplo.com',
      telefone: '11999990000',
    });
  });

  it('rejeita CNPJ para pessoa física', () => {
    const r = criarClienteSchema.safeParse({ ...clienteBase, cpfCnpj: '11.222.333/0001-81' });
    expect(r.success).toBe(false);
  });

  it('aceita CNPJ alfanumérico para pessoa jurídica', () => {
    const r = criarClienteSchema.safeParse({
      ...clienteBase,
      tipoPessoa: 'JURIDICA',
      cpfCnpj: '12.ABC.345/01DE-35',
    });
    expect(r.success).toBe(true);
  });
});

describe('usuário e campos comuns', () => {
  it('exige clienteId somente para o perfil CLIENTE', () => {
    const base = { nome: 'Fulano', email: 'f@x.example', senha: 'SenhaForte123' };
    expect(criarUsuarioSchema.safeParse({ ...base, perfil: 'CLIENTE' }).success).toBe(false);
    expect(
      criarUsuarioSchema.safeParse({ ...base, perfil: 'TECNICO', clienteId: veiculoBase.clienteId }).success,
    ).toBe(false);
  });

  it.each([
    ['curta', 'Abc12345'],
    ['sem números', 'SomenteLetrasAqui'],
    ['sem letras', '12345678901'],
    ['acima de 72 bytes', `A1${'ç'.repeat(40)}`],
  ])('rejeita senha %s', (_motivo, senha) => {
    expect(senhaSchema.safeParse(senha).success).toBe(false);
  });

  it('aceita senha forte', () => {
    expect(senhaSchema.safeParse('SenhaForte123').success).toBe(true);
  });

  it('valida e normaliza e-mail e telefone', () => {
    expect(emailSchema.parse('  USER@Exemplo.com ')).toBe('user@exemplo.com');
    expect(emailSchema.safeParse('invalido@').success).toBe(false);
    expect(telefoneSchema.safeParse('123').success).toBe(false);
  });
});
