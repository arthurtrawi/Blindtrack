/**
 * Seed do BlindTrack.
 *
 * 1. Modelo de etapas (sempre, idempotente via upsert por `codigo`).
 * 2. Usuários iniciais (sempre, idempotente via upsert por `email`; a senha de quem já
 *    existe NÃO é sobrescrita).
 * 3. Dados de exemplo (somente fora de produção, com SEED_DADOS_EXEMPLO=true e banco sem OS).
 *
 * A senha vem de SEED_SENHA_INICIAL no .env: nenhuma senha fica versionada.
 * Execução: npm run db:seed
 */
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { env } from '../src/config/env.js';
import { prisma, type TransactionClient } from '../src/config/prisma.js';
import type { PerfilUsuario } from '../src/generated/prisma/client.js';

const seedEnv = z
  .object({
    SEED_SENHA_INICIAL: z.string().min(12, 'SEED_SENHA_INICIAL deve ter pelo menos 12 caracteres'),
    SEED_DADOS_EXEMPLO: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .parse(process.env);

const DIA_MS = 24 * 60 * 60 * 1000;
const diasAPartirDeHoje = (dias: number): Date => new Date(Date.now() + dias * DIA_MS);

// -------------------------------------------------------------
// 1. Modelo de etapas (ADR-01). TROCA_VIDROS é a única dispensável (decisão da Fase 1).
// -------------------------------------------------------------
const MODELOS_ETAPA = [
  {
    codigo: 'RECEPCAO',
    nome: 'Recepção',
    descricao: 'Recebimento do veículo, checklist de entrada e registro fotográfico.',
    obrigatoria: true,
  },
  {
    codigo: 'DESMONTAGEM',
    nome: 'Desmontagem',
    descricao: 'Remoção de forrações, portas, painéis e vidros originais.',
    obrigatoria: true,
  },
  {
    codigo: 'INSTALACAO_MANTA',
    nome: 'Instalação da manta',
    descricao: 'Aplicação da manta balística e reforços nas áreas definidas no projeto.',
    obrigatoria: true,
  },
  {
    codigo: 'TROCA_VIDROS',
    nome: 'Troca de vidros',
    descricao: 'Substituição dos vidros originais por vidros blindados.',
    obrigatoria: false,
  },
  {
    codigo: 'REMONTAGEM',
    nome: 'Remontagem',
    descricao: 'Remontagem de portas, painéis, forrações e acabamento.',
    obrigatoria: true,
  },
  {
    codigo: 'VISTORIA',
    nome: 'Vistoria',
    descricao: 'Vistoria interna registrada pela equipe responsável.',
    obrigatoria: true,
  },
  {
    codigo: 'INSPECAO_FINAL',
    nome: 'Inspeção final',
    descricao: 'Inspeção final registrada pelo responsável técnico.',
    obrigatoria: true,
  },
  {
    codigo: 'ENTREGA',
    nome: 'Entrega',
    descricao: 'Entrega do veículo e da documentação ao cliente.',
    obrigatoria: true,
  },
] as const;

async function seedModelosEtapa(): Promise<void> {
  for (const [indice, modelo] of MODELOS_ETAPA.entries()) {
    const ordem = (indice + 1) * 10; // intervalos de 10 permitem inserir etapas entre as existentes
    await prisma.modeloEtapa.upsert({
      where: { codigo: modelo.codigo },
      create: { ...modelo, ordem },
      update: { nome: modelo.nome, descricao: modelo.descricao },
    });
  }
  console.log(`✔ ${MODELOS_ETAPA.length} modelos de etapa`);
}

// -------------------------------------------------------------
// 2. Usuários internos
// -------------------------------------------------------------
interface UsuarioSeed {
  nome: string;
  email: string;
  perfil: Exclude<PerfilUsuario, 'CLIENTE'>;
}

const USUARIOS_INTERNOS: UsuarioSeed[] = [
  { nome: 'Administrador do Sistema', email: 'admin@blindtrack.example', perfil: 'ADMIN' },
  { nome: 'Gestora de Produção', email: 'gestor@blindtrack.example', perfil: 'GESTOR' },
  { nome: 'Técnico de Blindagem 1', email: 'tecnico1@blindtrack.example', perfil: 'TECNICO' },
  { nome: 'Técnico de Blindagem 2', email: 'tecnico2@blindtrack.example', perfil: 'TECNICO' },
  { nome: 'Atendimento', email: 'atendimento@blindtrack.example', perfil: 'ATENDIMENTO' },
];

async function seedUsuarios(senhaHash: string): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const usuario of USUARIOS_INTERNOS) {
    const salvo = await prisma.usuario.upsert({
      where: { email: usuario.email },
      create: { ...usuario, senhaHash },
      update: { nome: usuario.nome },
      select: { id: true },
    });
    ids.set(usuario.email, salvo.id);
  }
  console.log(`✔ ${USUARIOS_INTERNOS.length} usuários internos`);
  return ids;
}

// -------------------------------------------------------------
// 3. Dados de exemplo (fictícios; CPF/CNPJ válidos apenas matematicamente)
// -------------------------------------------------------------
async function criarOrdemComEtapas(
  tx: TransactionClient,
  dados: {
    veiculoId: string;
    clienteId: string;
    abertaPorId: string;
    previsaoEntrega: Date;
    dataEntrada: Date;
  },
): Promise<{ id: string; numero: string; etapas: { id: string; codigo: string }[] }> {
  const modelos = await tx.modeloEtapa.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } });

  const ordem = await tx.ordemServico.create({
    data: {
      ...dados,
      observacoes: 'OS de exemplo criada pelo seed.',
      etapas: {
        create: modelos.map((m) => ({
          modeloEtapaId: m.id,
          codigo: m.codigo,
          nome: m.nome,
          descricao: m.descricao,
          ordem: m.ordem,
          obrigatoria: m.obrigatoria,
        })),
      },
      historicos: {
        create: {
          tipoEvento: 'ORDEM_SERVICO',
          statusAnterior: null,
          statusNovo: 'ABERTA',
          descricao: 'Ordem de serviço aberta',
          visivelCliente: true,
          usuarioId: dados.abertaPorId,
          // Mesma data da entrada, para a linha do tempo ficar em ordem cronológica.
          createdAt: dados.dataEntrada,
        },
      },
    },
    select: {
      id: true,
      numero: true,
      etapas: { select: { id: true, codigo: true }, orderBy: { ordem: 'asc' } },
    },
  });

  await tx.auditoria.create({
    data: {
      usuarioId: dados.abertaPorId,
      entidade: 'OrdemServico',
      entidadeId: ordem.id,
      acao: 'CRIAR',
      dadosNovos: { numero: ordem.numero, ...dados, origem: 'seed' },
    },
  });

  return ordem;
}

async function seedDadosExemplo(senhaHash: string, usuarios: Map<string, string>): Promise<void> {
  const totalOrdens = await prisma.ordemServico.count();
  if (totalOrdens > 0) {
    console.log('• Dados de exemplo ignorados: já existem ordens de serviço');
    return;
  }

  const idDe = (email: string): string => {
    const id = usuarios.get(email);
    if (!id) throw new Error(`Usuário de seed ausente: ${email}`);
    return id;
  };
  const atendimentoId = idDe('atendimento@blindtrack.example');
  const gestorId = idDe('gestor@blindtrack.example');
  const tecnico1Id = idDe('tecnico1@blindtrack.example');

  await prisma.$transaction(async (tx) => {
    // --- Clientes ---
    const clientePF = await tx.cliente.create({
      data: {
        tipoPessoa: 'FISICA',
        nome: 'Maria Exemplo da Silva',
        cpfCnpj: '52998224725',
        email: 'maria.cliente@exemplo.example',
        telefone: '11999990000',
        cep: '01310100',
        logradouro: 'Avenida Exemplo',
        numero: '1000',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
      },
    });
    const clientePJ = await tx.cliente.create({
      data: {
        tipoPessoa: 'JURIDICA',
        nome: 'Transportes Exemplo Ltda',
        cpfCnpj: '11222333000181',
        email: 'frota@transportes.example',
        telefone: '1133334444',
        cidade: 'Campinas',
        uf: 'SP',
      },
    });

    // --- Usuário do portal (perfil CLIENTE vinculado à cliente PF) ---
    await tx.usuario.create({
      data: {
        nome: clientePF.nome,
        email: 'cliente@blindtrack.example',
        senhaHash,
        perfil: 'CLIENTE',
        clienteId: clientePF.id,
      },
    });

    // --- Veículos ---
    const veiculoPF = await tx.veiculo.create({
      data: {
        placa: 'BRA2E19',
        chassi: '9BWZZZ377VT004251',
        marca: 'Toyota',
        modelo: 'Corolla Cross XRE',
        anoFabricacao: 2026,
        anoModelo: 2026,
        cor: 'Preto',
        clienteId: clientePF.id,
      },
    });
    const veiculoPJ = await tx.veiculo.create({
      data: {
        placa: 'ABC1234',
        chassi: '8AJBA3FS5R0123456',
        marca: 'Toyota',
        modelo: 'Hilux SRX',
        anoFabricacao: 2025,
        anoModelo: 2026,
        cor: 'Prata',
        clienteId: clientePJ.id,
      },
    });

    // --- OS 1: em andamento, com ocorrência e replanejamento ---
    const os1 = await criarOrdemComEtapas(tx, {
      veiculoId: veiculoPF.id,
      clienteId: clientePF.id,
      abertaPorId: atendimentoId,
      dataEntrada: diasAPartirDeHoje(-5),
      previsaoEntrega: diasAPartirDeHoje(25),
    });
    const etapa = (codigo: string): string => {
      const encontrada = os1.etapas.find((e) => e.codigo === codigo);
      if (!encontrada) throw new Error(`Etapa ${codigo} não encontrada`);
      return encontrada.id;
    };

    await tx.etapaProcesso.update({
      where: { id: etapa('RECEPCAO') },
      data: {
        status: 'CONCLUIDA',
        responsavelId: tecnico1Id,
        dataInicio: diasAPartirDeHoje(-5),
        previsaoConclusao: diasAPartirDeHoje(-4),
        dataConclusao: diasAPartirDeHoje(-4),
      },
    });
    await tx.etapaProcesso.update({
      where: { id: etapa('DESMONTAGEM') },
      data: {
        status: 'EM_ANDAMENTO',
        responsavelId: tecnico1Id,
        dataInicio: diasAPartirDeHoje(-3),
        previsaoConclusao: diasAPartirDeHoje(-1), // vencida → etapa atrasada (RN27a)
      },
    });
    await tx.ordemServico.update({ where: { id: os1.id }, data: { status: 'EM_ANDAMENTO' } });

    await tx.historicoStatus.createMany({
      data: [
        {
          ordemServicoId: os1.id,
          etapaProcessoId: etapa('RECEPCAO'),
          tipoEvento: 'ETAPA',
          statusAnterior: 'PENDENTE',
          statusNovo: 'EM_ANDAMENTO',
          descricao: 'Etapa Recepção iniciada',
          visivelCliente: true,
          usuarioId: tecnico1Id,
          createdAt: diasAPartirDeHoje(-5),
        },
        {
          ordemServicoId: os1.id,
          tipoEvento: 'ORDEM_SERVICO',
          statusAnterior: 'ABERTA',
          statusNovo: 'EM_ANDAMENTO',
          descricao: 'OS em andamento (primeira etapa iniciada)',
          visivelCliente: true,
          usuarioId: tecnico1Id,
          createdAt: diasAPartirDeHoje(-5),
        },
        {
          ordemServicoId: os1.id,
          etapaProcessoId: etapa('RECEPCAO'),
          tipoEvento: 'ETAPA',
          statusAnterior: 'EM_ANDAMENTO',
          statusNovo: 'CONCLUIDA',
          descricao: 'Etapa Recepção concluída',
          visivelCliente: true,
          usuarioId: tecnico1Id,
          createdAt: diasAPartirDeHoje(-4),
        },
        {
          ordemServicoId: os1.id,
          etapaProcessoId: etapa('DESMONTAGEM'),
          tipoEvento: 'ETAPA',
          statusAnterior: 'PENDENTE',
          statusNovo: 'EM_ANDAMENTO',
          descricao: 'Etapa Desmontagem iniciada',
          visivelCliente: true,
          usuarioId: tecnico1Id,
          createdAt: diasAPartirDeHoje(-3),
        },
      ],
    });

    const ocorrencia = await tx.ocorrencia.create({
      data: {
        ordemServicoId: os1.id,
        etapaProcessoId: etapa('INSTALACAO_MANTA'),
        titulo: 'Aguardando manta balística do fornecedor',
        descricao: 'Lote de manta previsto para esta semana foi reprogramado pelo fornecedor.',
        tipo: 'AGUARDANDO_PECA',
        prioridade: 'ALTA',
        impeditiva: true,
        visivelCliente: true,
        descricaoCliente: 'Aguardando material de um fornecedor. A previsão de entrega foi ajustada.',
        usuarioResponsavelId: gestorId,
        abertaPorId: gestorId,
        dataAbertura: diasAPartirDeHoje(-2),
      },
    });
    await tx.historicoStatus.create({
      data: {
        ordemServicoId: os1.id,
        etapaProcessoId: etapa('INSTALACAO_MANTA'),
        ocorrenciaId: ocorrencia.id,
        tipoEvento: 'OCORRENCIA',
        statusNovo: 'ABERTA',
        descricao: `Ocorrência aberta: ${ocorrencia.titulo}`,
        visivelCliente: true,
        usuarioId: gestorId,
        createdAt: diasAPartirDeHoje(-2),
      },
    });

    const previsaoAnterior = diasAPartirDeHoje(25);
    const previsaoNova = diasAPartirDeHoje(30);
    await tx.alteracaoPrevisao.create({
      data: {
        ordemServicoId: os1.id,
        ocorrenciaId: ocorrencia.id,
        previsaoAnterior,
        previsaoNova,
        justificativa: 'Atraso na entrega da manta balística pelo fornecedor.',
        usuarioId: gestorId,
      },
    });
    await tx.ordemServico.update({ where: { id: os1.id }, data: { previsaoEntrega: previsaoNova } });

    // --- OS 2: aberta e com previsão vencida → OS atrasada (RN27b) ---
    await criarOrdemComEtapas(tx, {
      veiculoId: veiculoPJ.id,
      clienteId: clientePJ.id,
      abertaPorId: atendimentoId,
      dataEntrada: diasAPartirDeHoje(-40),
      previsaoEntrega: diasAPartirDeHoje(-2),
    });
  });

  console.log('✔ dados de exemplo: 2 clientes, 2 veículos, 1 usuário de portal, 2 OS, 1 ocorrência');
}

async function main(): Promise<void> {
  console.log(`Seed em ${env.NODE_ENV}...`);
  const senhaHash = await bcrypt.hash(seedEnv.SEED_SENHA_INICIAL, env.BCRYPT_SALT_ROUNDS);

  await seedModelosEtapa();
  const usuarios = await seedUsuarios(senhaHash);

  if (seedEnv.SEED_DADOS_EXEMPLO && env.NODE_ENV !== 'production') {
    await seedDadosExemplo(senhaHash, usuarios);
  }
}

main()
  .catch((erro: unknown) => {
    console.error('Falha no seed:', erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
