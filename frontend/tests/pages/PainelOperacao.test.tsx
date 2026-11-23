/**
 * Painel administrativo (Fase 5b): layout e menu por perfil, dashboard, lista de OS e
 * detalhe com as ações de etapa, OS, ocorrências e documentos.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PerfilUsuario } from '@/types/usuario';
import {
  chamadas,
  erroApi,
  instalarApiFalsa,
  json,
  renderizarApp,
  usuarioDe,
  type RequisicaoFalsa,
} from '../helpers/api-falsa';
import { etapaPainel, ordemDetalhe, ordemResumo } from '../helpers/dados-painel';
import { paginado } from '../helpers/dados-portal';

const sessao = (perfil: PerfilUsuario) => () => json({ data: usuarioDe(perfil) });
const indicadores = {
  porStatus: { ABERTA: 2, EM_ANDAMENTO: 5, SUSPENSA: 0, PRONTA_PARA_ENTREGA: 1, ENTREGUE: 9, CANCELADA: 1 },
  ordensAtivas: 8,
  ordensAtrasadas: 3,
  entregasProximos7Dias: 2,
  ocorrenciasAtivas: 4,
  etapasEmCurso: 5,
  etapasAtrasadas: 1,
  geradoEm: '2026-11-23T12:00:00.000Z',
};

function rotasDetalhe(
  perfil: PerfilUsuario,
  ordem = ordemDetalhe(),
  extras: Record<string, (r: RequisicaoFalsa) => Response> = {},
) {
  return instalarApiFalsa({
    'GET /auth/me': sessao(perfil),
    'GET /ordens-servico/os-1': () => json({ data: ordem }),
    'GET /usuarios/responsaveis': () =>
      json({
        data: [
          { id: 'id-tecnico', nome: 'Técnico Um', perfil: 'TECNICO' },
          { id: 'id-gestor', nome: 'Gestor', perfil: 'GESTOR' },
        ],
      }),
    'GET /ordens-servico/os-1/ocorrencias': () => json({ data: [] }),
    'GET /ordens-servico/os-1/documentos': () => json({ data: [] }),
    'GET /ordens-servico/os-1/linha-do-tempo': () => json({ data: [] }),
    ...extras,
  });
}

describe('Layout e menu por perfil', () => {
  it.each<[PerfilUsuario, string[], string[]]>([
    ['ADMIN', ['Dashboard', 'Ordens de serviço', 'Clientes', 'Veículos', 'Usuários', 'Configurações'], []],
    ['GESTOR', ['Dashboard', 'Ordens de serviço', 'Configurações'], ['Usuários']],
    ['TECNICO', ['Dashboard', 'Ordens de serviço'], ['Usuários', 'Configurações']],
    ['ATENDIMENTO', ['Clientes', 'Veículos'], ['Usuários', 'Configurações']],
  ])('%s vê só os itens permitidos', async (perfil, visiveis, ocultos) => {
    instalarApiFalsa({
      'GET /auth/me': sessao(perfil),
      'GET /dashboard/indicadores': () => json({ data: indicadores }),
    });
    renderizarApp('/painel');

    const menu = await screen.findByRole('navigation', { name: 'Menu principal' });
    for (const item of visiveis) expect(within(menu).getByRole('link', { name: item })).toBeInTheDocument();
    for (const item of ocultos)
      expect(within(menu).queryByRole('link', { name: item })).not.toBeInTheDocument();
  });

  it('menu móvel abre como gaveta e fecha com Esc', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessao('GESTOR'),
      'GET /dashboard/indicadores': () => json({ data: indicadores }),
    });
    renderizarApp('/painel');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });
});

describe('Dashboard', () => {
  it('mostra os indicadores reais e liga aos filtros da lista', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessao('GESTOR'),
      'GET /dashboard/indicadores': () => json({ data: indicadores }),
      'GET /ordens-servico': () =>
        json(paginado([ordemResumo({ prazo: { ...ordemResumo().prazo, atrasada: true, diasAtraso: 4 } })])),
    });
    renderizarApp('/painel');

    const atrasadas = await screen.findByRole('link', { name: /Ordens atrasadas\s*3/ });
    expect(atrasadas).toHaveAttribute('href', '/painel/ordens?atrasada=true');
    expect(screen.getByText('Ocorrências ativas').closest('div')?.parentElement).toHaveTextContent('4');
    expect(screen.getByRole('table', { name: /por status/i })).toHaveTextContent('Entregue');
    expect(await screen.findByText(/4 dias · prev\./)).toBeInTheDocument();
  });

  it('erro de rede mostra mensagem e "Tentar novamente"', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessao('GESTOR'),
      'GET /dashboard/indicadores': () => {
        throw new TypeError('Failed to fetch');
      },
      'GET /ordens-servico': () => json(paginado([])),
    });
    renderizarApp('/painel');

    expect(await screen.findByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });
});

describe('Lista de ordens de serviço', () => {
  it('lista com etapa atual e responsável; filtros e ordenação vão para a API', async () => {
    const consultas: URLSearchParams[] = [];
    instalarApiFalsa({
      'GET /auth/me': sessao('GESTOR'),
      'GET /ordens-servico': ({ url }) => {
        consultas.push(url.searchParams);
        return json(paginado([ordemResumo()]));
      },
    });
    renderizarApp('/painel/ordens');
    const usuario = userEvent.setup();

    const tabela = await screen.findByRole('table');
    expect(within(tabela).getByText('OS-2026-000001')).toBeInTheDocument();
    expect(within(tabela).getByText('Técnico Um')).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Status'), 'EM_ANDAMENTO');
    await waitFor(() => expect(consultas.at(-1)?.get('status')).toBe('EM_ANDAMENTO'));

    await usuario.type(screen.getByLabelText('Cliente'), 'maria');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(consultas.at(-1)?.get('cliente')).toBe('maria'));

    await usuario.click(within(tabela).getByRole('button', { name: /Previsão/ }));
    await waitFor(() => expect(consultas.at(-1)?.get('ordenarPor')).toBe('previsaoEntrega'));
    expect(consultas.at(-1)?.get('status')).toBe('EM_ANDAMENTO'); // filtros preservados
  });

  it('TECNICO não vê "Nova OS"; ATENDIMENTO vê', async () => {
    instalarApiFalsa({ 'GET /auth/me': sessao('TECNICO'), 'GET /ordens-servico': () => json(paginado([])) });
    const { unmount } = renderizarApp('/painel/ordens');
    expect(await screen.findByText('Nenhuma ordem de serviço encontrada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nova OS/ })).not.toBeInTheDocument();
    unmount();

    instalarApiFalsa({
      'GET /auth/me': sessao('ATENDIMENTO'),
      'GET /ordens-servico': () => json(paginado([])),
    });
    renderizarApp('/painel/ordens');
    expect(await screen.findByRole('button', { name: /Nova OS/ })).toBeInTheDocument();
  });
});

describe('Detalhe da OS — etapas', () => {
  it('técnico responsável inicia a próxima etapa; a ação vai para a API', async () => {
    const corpos: unknown[] = [];
    rotasDetalhe('TECNICO', undefined, {
      'PATCH /etapas/etapa-2/status': ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: { ...etapaPainel(1, 'EM_ANDAMENTO'), statusOrdem: 'EM_ANDAMENTO' } });
      },
    });
    renderizarApp('/painel/ordens/os-1');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Iniciar Desmontagem' }));

    await waitFor(() => expect(corpos).toEqual([{ acao: 'INICIAR' }]));
    expect(await screen.findByText(/Desmontagem: em andamento/)).toBeInTheDocument();
  });

  it('técnico NÃO vê ações em etapa de outro responsável nem as de gestão', async () => {
    const ordem = ordemDetalhe({
      etapas: [
        etapaPainel(0, 'CONCLUIDA'),
        etapaPainel(1, 'EM_ANDAMENTO', { id: 'outro', nome: 'Outro Técnico' }),
      ],
    });
    rotasDetalhe('TECNICO', ordem);
    renderizarApp('/painel/ordens/os-1');

    await screen.findByRole('heading', { name: 'OS OS-2026-000001' });
    expect(
      screen.queryByRole('button', { name: /Pausar|Concluir|Reabrir|Responsável|Prazo/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Suspender|Cancelar OS/ })).not.toBeInTheDocument();
  });

  it('pausar exige justificativa antes de enviar', async () => {
    const corpos: unknown[] = [];
    const ordem = ordemDetalhe({
      etapas: [etapaPainel(0, 'EM_ANDAMENTO', { id: 'id-gestor', nome: 'Gestor' })],
    });
    rotasDetalhe('GESTOR', ordem, {
      'PATCH /etapas/etapa-1/status': ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: { ...etapaPainel(0, 'PAUSADA'), statusOrdem: 'EM_ANDAMENTO' } });
      },
    });
    renderizarApp('/painel/ordens/os-1');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Pausar Recepção' }));
    const dialogo = screen.getByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Pausar' }));
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('mínimo de 5 caracteres');
    expect(corpos).toHaveLength(0);

    await usuario.type(within(dialogo).getByLabelText('Justificativa'), 'Aguardando peça do fornecedor');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Pausar' }));
    await waitFor(() =>
      expect(corpos).toEqual([{ acao: 'PAUSAR', justificativa: 'Aguardando peça do fornecedor' }]),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('regra de negócio violada (RN17) aparece com o código e a lista de pendências', async () => {
    const ordem = ordemDetalhe({
      status: 'PRONTA_PARA_ENTREGA',
      etapas: [
        etapaPainel(0, 'CONCLUIDA'),
        etapaPainel(7, 'EM_ANDAMENTO', { id: 'id-gestor', nome: 'Gestor' }),
      ],
    });
    rotasDetalhe('GESTOR', ordem, {
      'PATCH /etapas/etapa-8/status': () =>
        json(
          {
            error: {
              code: 'RN17',
              message: 'Requisitos para a entrega não atendidos',
              details: { pendencias: ['Documentos obrigatórios sem aprovação: CONTRATO, TERMO_ENTREGA'] },
            },
          },
          422,
        ),
    });
    renderizarApp('/painel/ordens/os-1');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Concluir Entrega' }));
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('encerra a OS');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Concluir' }));

    const alerta = await screen.findByText(/Requisitos para a entrega não atendidos \(RN17\)/);
    expect(alerta.closest('[role="alert"]')).toHaveTextContent('CONTRATO, TERMO_ENTREGA');
    expect(screen.getByRole('dialog')).toBeInTheDocument(); // continua aberto para nova tentativa
  });

  it('gestor atribui responsável escolhendo da lista de responsáveis', async () => {
    const corpos: unknown[] = [];
    rotasDetalhe('GESTOR', undefined, {
      'PATCH /etapas/etapa-3/responsavel': ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: etapaPainel(2, 'PENDENTE', { id: 'id-tecnico', nome: 'Técnico Um' }) });
      },
    });
    renderizarApp('/painel/ordens/os-1');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Responsável de Instalação da manta' }));
    const dialogo = screen.getByRole('dialog');
    await waitFor(() => expect(within(dialogo).getAllByRole('option')).toHaveLength(3));
    await usuario.selectOptions(within(dialogo).getByLabelText('Responsável técnico'), 'id-tecnico');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(corpos).toEqual([{ responsavelId: 'id-tecnico' }]));
  });

  it('OS suspensa: sem ações de etapa e com aviso', async () => {
    rotasDetalhe('GESTOR', ordemDetalhe({ status: 'SUSPENSA' }));
    renderizarApp('/painel/ordens/os-1');

    expect(await screen.findByText(/A OS está suspensa/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Iniciar / })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retomar/ })).toBeInTheDocument();
  });
});

describe('Detalhe da OS — ações da OS', () => {
  it('cancelar pede confirmação de perigo com justificativa', async () => {
    const corpos: unknown[] = [];
    rotasDetalhe('GESTOR', undefined, {
      'PATCH /ordens-servico/os-1/status': ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: ordemDetalhe({ status: 'CANCELADA' }) });
      },
    });
    renderizarApp('/painel/ordens/os-1');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: /Cancelar OS/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Cancelar ordem de serviço' });
    expect(dialogo).toHaveTextContent('não pode ser desfeita');
    await usuario.type(within(dialogo).getByLabelText('Justificativa'), 'Cliente desistiu do serviço');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar OS' }));

    await waitFor(() =>
      expect(corpos).toEqual([{ acao: 'CANCELAR', justificativa: 'Cliente desistiu do serviço' }]),
    );
  });

  it('OS de outro id inexistente mostra "não encontrada"', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessao('GESTOR'),
      'GET /ordens-servico/nao-existe': () => erroApi(404, 'NOT_FOUND', 'Ordem de serviço não encontrado(a)'),
    });
    renderizarApp('/painel/ordens/nao-existe');
    expect(await screen.findByText('Ordem de serviço não encontrada')).toBeInTheDocument();
  });
});

describe('Detalhe da OS — ocorrências e documentos', () => {
  it('registrar ocorrência visível exige texto para o cliente; técnico fica como responsável', async () => {
    const corpos: unknown[] = [];
    const fetch = rotasDetalhe('TECNICO', undefined, {
      'POST /ordens-servico/os-1/ocorrencias': ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: {} }, 201);
      },
    });
    renderizarApp('/painel/ordens/os-1');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('tab', { name: /Ocorrências/ }));
    await usuario.click(await screen.findByRole('button', { name: /Registrar ocorrência/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Registrar ocorrência' });
    await usuario.type(within(dialogo).getByLabelText('Título'), 'Peça em falta');
    await usuario.type(within(dialogo).getByLabelText('Descrição (interna)'), 'Fornecedor atrasou o lote');
    await usuario.click(within(dialogo).getByLabelText('Visível ao cliente'));
    await usuario.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    expect(await within(dialogo).findByText(/texto que o cliente verá/)).toBeInTheDocument();
    expect(corpos).toHaveLength(0);

    await usuario.type(within(dialogo).getByLabelText('Texto para o cliente'), 'Aguardando material');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(corpos).toHaveLength(1));
    expect(corpos[0]).toMatchObject({
      titulo: 'Peça em falta',
      usuarioResponsavelId: 'id-tecnico',
      visivelCliente: true,
      descricaoCliente: 'Aguardando material',
    });
    expect(chamadas(fetch, 'GET /usuarios/responsaveis')).toBe(0); // técnico não lista responsáveis
  });

  it('gestor aprova documento pendente; rejeitar exige motivo', async () => {
    const avaliacoes: unknown[] = [];
    const documento = {
      id: 'doc-1',
      ordemServicoId: 'os-1',
      nome: 'Contrato assinado',
      tipo: 'CONTRATO',
      caminhoArquivo: '2026/11/x.pdf',
      nomeOriginal: 'contrato.pdf',
      mimeType: 'application/pdf',
      tamanhoBytes: 2048,
      hashSha256: 'a'.repeat(64),
      status: 'PENDENTE',
      visivelCliente: true,
      enviadoPorId: 'id-atendimento',
      avaliadoPorId: null,
      avaliadoEm: null,
      motivoRejeicao: null,
      createdAt: '2026-11-20T12:00:00.000Z',
      updatedAt: '2026-11-20T12:00:00.000Z',
      enviadoPor: { id: 'id-atendimento', nome: 'Atendimento' },
      avaliadoPor: null,
    };
    rotasDetalhe('GESTOR', ordemDetalhe({ totalDocumentos: 1 }), {
      'GET /ordens-servico/os-1/documentos': () => json({ data: [documento] }),
      'PATCH /documentos/doc-1/status': ({ corpo }) => {
        avaliacoes.push(corpo);
        return json({ data: { ...documento, status: 'APROVADO' } });
      },
    });
    renderizarApp('/painel/ordens/os-1');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('tab', { name: /Documentos/ }));
    expect(await screen.findByRole('region', { name: /obrigatórios/i })).toHaveTextContent(
      'Contrato: pendente',
    );

    await usuario.click(screen.getByRole('button', { name: 'Rejeitar Contrato assinado' }));
    const dialogo = screen.getByRole('dialog', { name: 'Rejeitar documento' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Rejeitar' }));
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('motivo da rejeição');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Voltar' }));

    await usuario.click(screen.getByRole('button', { name: 'Aprovar Contrato assinado' }));
    await waitFor(() => expect(avaliacoes).toEqual([{ status: 'APROVADO' }]));
  });
});
