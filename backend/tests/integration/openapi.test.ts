/**
 * A documentação OpenAPI corresponde à aplicação real:
 * - cada operação documentada existe (não responde "Rota ... não encontrado");
 * - os perfis documentados são exatamente os que conseguem passar da autorização.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import { OPERACOES, openApiDocument, type Operacao } from '../../src/config/swagger.js';
import type { PerfilUsuario } from '../../src/generated/prisma/client.js';
import { bancoDisponivel, limparBanco } from '../helpers/db.js';
import { criarCliente, criarUsuario, type UsuarioTeste } from '../helpers/fabrica.js';

const app = createApp();
const temBanco = await bancoDisponivel();
const ID_QUALQUER = '01a206c8-0000-7000-8000-000000000000';
const TODOS_PERFIS: PerfilUsuario[] = ['ADMIN', 'GESTOR', 'TECNICO', 'ATENDIMENTO', 'CLIENTE'];

function chamar(op: Operacao, usuario?: UsuarioTeste) {
  const caminho = `/api/v1${op.caminho.replace('{id}', ID_QUALQUER)}`;
  const req = request(app)[op.metodo](caminho);
  if (usuario) req.set(usuario.auth);
  return op.metodo === 'get' || op.metodo === 'delete' ? req : req.send({});
}

describe('Especificação OpenAPI', () => {
  it('tem operationId único e respostas em todas as operações', () => {
    const ids = Object.values(openApiDocument.paths).flatMap((metodos) =>
      Object.values(metodos).map((op) => (op as { operationId: string }).operationId),
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(OPERACOES.length);
  });

  it('é servida pelo Swagger UI', async () => {
    const resposta = await request(app).get('/api/v1/docs/');
    expect(resposta.status).toBe(200);
  });
});

describe.runIf(temBanco)('Documentação × rotas reais', () => {
  const usuarios = {} as Record<PerfilUsuario, UsuarioTeste>;

  beforeAll(async () => {
    await limparBanco();
    const cliente = await criarCliente();
    for (const perfil of TODOS_PERFIS) {
      usuarios[perfil] = await criarUsuario(perfil, perfil === 'CLIENTE' ? { clienteId: cliente.id } : {});
    }
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it.each(OPERACOES.map((op) => [`${op.metodo.toUpperCase()} ${op.caminho}`, op] as const))(
    '%s existe e respeita os perfis documentados',
    async (_nome, op) => {
      if (op.perfis === 'PUBLICO') {
        const resposta = await chamar(op);
        expect(resposta.body?.error?.message ?? '').not.toMatch(/^Rota /);
        return;
      }

      // Sem token: 401 em toda rota protegida.
      expect((await chamar(op)).status).toBe(401);

      const permitidos = op.perfis.length === 0 ? TODOS_PERFIS : op.perfis;
      for (const perfil of TODOS_PERFIS) {
        const resposta = await chamar(op, usuarios[perfil]);
        // A rota existe (não é o 404 de rota inexistente)...
        expect(resposta.body?.error?.message ?? '', `${perfil}`).not.toMatch(/^Rota /);
        // ...e o 403 por perfil acontece exatamente para quem não está documentado.
        const negadoPorPerfil = resposta.status === 403 && resposta.body?.error?.code === 'FORBIDDEN';
        expect(negadoPorPerfil, `${perfil} em ${op.metodo.toUpperCase()} ${op.caminho}`).toBe(
          !permitidos.includes(perfil),
        );
      }
    },
  );
});
