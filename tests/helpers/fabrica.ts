/**
 * Fábrica de dados para testes de integração.
 * Cria registros direto pelo Prisma (rápido) e gera tokens com o mesmo service da API.
 */
import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/prisma.js';
import type { PerfilUsuario } from '../../src/generated/prisma/client.js';
import { gerarToken } from '../../src/services/auth.service.js';

export const SENHA_TESTE = 'SenhaTeste123';

let hashCache: string | null = null;
async function hashSenhaTeste(): Promise<string> {
  // Custo baixo apenas nos testes: o hash é calculado uma vez e reaproveitado.
  hashCache ??= await bcrypt.hash(SENHA_TESTE, 4);
  return hashCache;
}

let sequencia = 0;
const proximo = (): number => ++sequencia;

export interface UsuarioTeste {
  id: string;
  email: string;
  perfil: PerfilUsuario;
  token: string;
  /** Cabeçalho Authorization pronto para o Supertest. */
  auth: { Authorization: string };
}

export async function criarUsuario(
  perfil: PerfilUsuario,
  opcoes: { ativo?: boolean; clienteId?: string } = {},
): Promise<UsuarioTeste> {
  const n = proximo();
  const usuario = await prisma.usuario.create({
    data: {
      nome: `Usuário ${perfil} ${n}`,
      email: `${perfil.toLowerCase()}${n}@teste.example`,
      senhaHash: await hashSenhaTeste(),
      perfil,
      ativo: opcoes.ativo ?? true,
      clienteId: opcoes.clienteId ?? null,
    },
  });
  const { token } = gerarToken(usuario);
  return {
    id: usuario.id,
    email: usuario.email,
    perfil,
    token,
    auth: { Authorization: `Bearer ${token}` },
  };
}

/** CPFs com dígitos verificadores válidos (fictícios). */
export const CPFS_VALIDOS = ['52998224725', '12345678909', '11144477735', '98765432100'] as const;
export const CNPJ_VALIDO = '11222333000181';
/** CNPJ alfanumérico de exemplo da Receita Federal (IN RFB 2.229/2024). */
export const CNPJ_ALFANUMERICO_VALIDO = '12ABC34501DE35';

export async function criarCliente(cpf: string = CPFS_VALIDOS[0]): Promise<{ id: string }> {
  return prisma.cliente.create({
    data: {
      tipoPessoa: 'FISICA',
      nome: `Cliente ${proximo()}`,
      cpfCnpj: cpf,
      email: 'cliente@teste.example',
      telefone: '11999990000',
    },
    select: { id: true },
  });
}

export async function criarVeiculo(
  clienteId: string,
  placa = 'TST1A23',
  chassi = '9BWZZZ377VT004251',
): Promise<{ id: string }> {
  return prisma.veiculo.create({
    data: {
      placa,
      chassi,
      marca: 'Marca',
      modelo: 'Modelo',
      anoFabricacao: 2025,
      anoModelo: 2026,
      cor: 'Preto',
      clienteId,
    },
    select: { id: true },
  });
}

export async function abrirOrdem(dados: {
  clienteId: string;
  veiculoId: string;
  abertaPorId: string;
}): Promise<{ id: string; numero: string }> {
  return prisma.ordemServico.create({
    data: { ...dados, previsaoEntrega: new Date(Date.now() + 30 * 86_400_000) },
    select: { id: true, numero: true },
  });
}
