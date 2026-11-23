/**
 * Testes de integração da modelagem (Fase 3): verificam, no PostgreSQL real, as regras
 * garantidas pelo banco (constraints, índices parciais, sequence e triggers append-only).
 * As regras de negócio dos services são testadas nas Fases 4 e 5.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import { bancoDisponivel, limparBanco } from '../helpers/db.js';

const temBanco = await bancoDisponivel();

async function criarCenarioBase(): Promise<{
  usuarioId: string;
  clienteId: string;
  veiculoId: string;
}> {
  const usuario = await prisma.usuario.create({
    data: { nome: 'Gestor Teste', email: 'gestor@teste.example', senhaHash: 'hash-fake', perfil: 'GESTOR' },
  });
  const cliente = await prisma.cliente.create({
    data: {
      tipoPessoa: 'FISICA',
      nome: 'Cliente Teste',
      cpfCnpj: '52998224725',
      email: 'cliente@teste.example',
      telefone: '11999990000',
    },
  });
  const veiculo = await prisma.veiculo.create({
    data: {
      placa: 'TST1A23',
      chassi: '9BWZZZ377VT004251',
      marca: 'Marca',
      modelo: 'Modelo',
      anoFabricacao: 2025,
      anoModelo: 2026,
      cor: 'Preto',
      clienteId: cliente.id,
    },
  });
  return { usuarioId: usuario.id, clienteId: cliente.id, veiculoId: veiculo.id };
}

async function abrirOrdem(base: { usuarioId: string; clienteId: string; veiculoId: string }) {
  return prisma.ordemServico.create({
    data: {
      veiculoId: base.veiculoId,
      clienteId: base.clienteId,
      abertaPorId: base.usuarioId,
      previsaoEntrega: new Date(Date.now() + 30 * 86_400_000),
    },
  });
}

describe.runIf(temBanco)('Modelagem — regras garantidas pelo PostgreSQL', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('gera número de OS único no formato OS-AAAA-NNNNNN (RN02)', async () => {
    const base = await criarCenarioBase();
    const ordem = await abrirOrdem(base);

    expect(ordem.numero).toMatch(/^OS-\d{4}-\d{6}$/);
    expect(ordem.status).toBe('ABERTA');
  });

  it('impede duas OS não encerradas para o mesmo veículo (RN03)', async () => {
    const base = await criarCenarioBase();
    await abrirOrdem(base);

    await expect(abrirOrdem(base)).rejects.toMatchObject({ code: 'P2002' });
  });

  it('permite nova OS para o veículo depois que a anterior é cancelada (RN03)', async () => {
    const base = await criarCenarioBase();
    const primeira = await abrirOrdem(base);
    await prisma.ordemServico.update({ where: { id: primeira.id }, data: { status: 'CANCELADA' } });

    const segunda = await abrirOrdem(base);
    expect(segunda.numero).not.toBe(primeira.numero);
  });

  it('rejeita placa, chassi e CPF duplicados (RN33, RN34)', async () => {
    const base = await criarCenarioBase();

    await expect(
      prisma.veiculo.create({
        data: {
          placa: 'TST1A23',
          chassi: '8AJBA3FS5R0123456',
          marca: 'X',
          modelo: 'Y',
          anoFabricacao: 2025,
          anoModelo: 2025,
          cor: 'Azul',
          clienteId: base.clienteId,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await expect(
      prisma.cliente.create({
        data: {
          tipoPessoa: 'FISICA',
          nome: 'Outro',
          cpfCnpj: '52998224725',
          email: 'o@x.example',
          telefone: '1',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('exige responsável para etapa EM_ANDAMENTO (RN10)', async () => {
    const base = await criarCenarioBase();
    const ordem = await abrirOrdem(base);

    await expect(
      prisma.etapaProcesso.create({
        data: {
          ordemServicoId: ordem.id,
          codigo: 'RECEPCAO',
          nome: 'Recepção',
          ordem: 10,
          status: 'EM_ANDAMENTO',
        },
      }),
    ).rejects.toThrow(/etapas_responsavel_em_andamento_chk/);
  });

  it('exige data de conclusão para etapa CONCLUIDA (RN11)', async () => {
    const base = await criarCenarioBase();
    const ordem = await abrirOrdem(base);

    await expect(
      prisma.etapaProcesso.create({
        data: {
          ordemServicoId: ordem.id,
          codigo: 'RECEPCAO',
          nome: 'Recepção',
          ordem: 10,
          status: 'CONCLUIDA',
        },
      }),
    ).rejects.toThrow(/etapas_data_conclusao_chk/);
  });

  it('exige vínculo com cliente para usuário de perfil CLIENTE', async () => {
    await expect(
      prisma.usuario.create({
        data: { nome: 'Sem vínculo', email: 'sem@teste.example', senhaHash: 'h', perfil: 'CLIENTE' },
      }),
    ).rejects.toThrow(/usuarios_cliente_perfil_chk/);
  });

  it('torna o histórico imutável: UPDATE e DELETE são bloqueados (RN28)', async () => {
    const base = await criarCenarioBase();
    const ordem = await abrirOrdem(base);
    const historico = await prisma.historicoStatus.create({
      data: {
        ordemServicoId: ordem.id,
        tipoEvento: 'ORDEM_SERVICO',
        statusNovo: 'ABERTA',
        descricao: 'Ordem aberta',
        usuarioId: base.usuarioId,
      },
    });

    await expect(
      prisma.historicoStatus.update({ where: { id: historico.id }, data: { descricao: 'adulterado' } }),
    ).rejects.toThrow(/somente de inserção/);
    await expect(prisma.historicoStatus.delete({ where: { id: historico.id } })).rejects.toThrow(
      /somente de inserção/,
    );

    const intacto = await prisma.historicoStatus.findUniqueOrThrow({ where: { id: historico.id } });
    expect(intacto.descricao).toBe('Ordem aberta');
  });

  it('torna a auditoria imutável', async () => {
    const base = await criarCenarioBase();
    const registro = await prisma.auditoria.create({
      data: { usuarioId: base.usuarioId, entidade: 'Cliente', entidadeId: base.clienteId, acao: 'CRIAR' },
    });

    await expect(prisma.auditoria.delete({ where: { id: registro.id } })).rejects.toThrow(
      /somente de inserção/,
    );
  });

  it('impede excluir cliente com veículos vinculados (integridade referencial)', async () => {
    const base = await criarCenarioBase();

    await expect(prisma.cliente.delete({ where: { id: base.clienteId } })).rejects.toBeDefined();
    expect(await prisma.cliente.count()).toBe(1);
  });
});
