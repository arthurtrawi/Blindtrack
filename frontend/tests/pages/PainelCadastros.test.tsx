/**
 * Painel (Fase 5c): cadastros de clientes, veículos, usuários e modelo de etapas.
 * Validação no navegador com as mesmas regras do backend + erros 400 da API no campo certo.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PerfilUsuario } from '@/types/usuario';
import { cnpjValido, cpfValido } from '@/utils/validacao';
import { erroApi, instalarApiFalsa, json, renderizarApp, usuarioDe } from '../helpers/api-falsa';
import { paginado } from '../helpers/dados-portal';

const sessao = (perfil: PerfilUsuario) => () => json({ data: usuarioDe(perfil) });

const clienteCompleto = {
  id: 'cliente-1',
  tipoPessoa: 'FISICA',
  nome: 'Maria Souza',
  cpfCnpj: '52998224725',
  email: 'maria@exemplo.example',
  telefone: '11999990000',
  cep: null,
  logradouro: null,
  numero: null,
  complemento: null,
  bairro: null,
  cidade: 'São Paulo',
  uf: 'SP',
  createdAt: '2026-11-01T12:00:00.000Z',
  updatedAt: '2026-11-01T12:00:00.000Z',
  deletedAt: null,
};

describe('Validadores espelhados do backend', () => {
  it('CPF e CNPJ (inclusive alfanumérico) com dígitos verificadores', () => {
    expect(cpfValido('52998224725')).toBe(true);
    expect(cpfValido('52998224726')).toBe(false);
    expect(cnpjValido('11222333000181')).toBe(true);
    expect(cnpjValido('12ABC34501DE35')).toBe(true);
    expect(cnpjValido('12ABC34501DE36')).toBe(false);
  });
});

describe('Clientes', () => {
  it('TECNICO vê documento mascarado, sem contato e sem botões de edição', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessao('TECNICO'),
      'GET /clientes': () =>
        json(
          paginado([
            { id: 'cliente-1', tipoPessoa: 'FISICA', nome: 'Maria Souza', cpfCnpj: '***.982.247-**' },
          ]),
        ),
    });
    renderizarApp('/painel/clientes');

    expect(await screen.findByText('***.982.247-**')).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo cliente|Editar|Inativar/ })).not.toBeInTheDocument();
  });

  it('cadastro valida CPF no navegador e envia os dados normalizados', async () => {
    const corpos: unknown[] = [];
    instalarApiFalsa({
      'GET /auth/me': sessao('ATENDIMENTO'),
      'GET /clientes': () => json(paginado([])),
      'POST /clientes': ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: clienteCompleto }, 201);
      },
    });
    renderizarApp('/painel/clientes');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: /Novo cliente/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Novo cliente' });
    await usuario.type(within(dialogo).getByLabelText('CPF'), '529.982.247-26');
    await usuario.type(within(dialogo).getByLabelText('Nome completo'), 'Maria Souza');
    await usuario.type(within(dialogo).getByLabelText('E-mail'), 'Maria@Exemplo.Example');
    await usuario.type(within(dialogo).getByLabelText('Telefone'), '(11) 99999-0000');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText('CPF/CNPJ inválido')).toBeInTheDocument();
    expect(corpos).toHaveLength(0);

    await usuario.clear(within(dialogo).getByLabelText('CPF'));
    await usuario.type(within(dialogo).getByLabelText('CPF'), '529.982.247-25');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(corpos).toHaveLength(1));
    expect(corpos[0]).toEqual({
      tipoPessoa: 'FISICA',
      nome: 'Maria Souza',
      cpfCnpj: '52998224725',
      email: 'maria@exemplo.example',
      telefone: '11999990000',
    });
  });

  it('CPF duplicado (409 da API) aparece no formulário', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessao('ATENDIMENTO'),
      'GET /clientes': () => json(paginado([])),
      'POST /clientes': () => erroApi(409, 'CONFLICT', 'CPF/CNPJ já cadastrado'),
    });
    renderizarApp('/painel/clientes');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: /Novo cliente/ }));
    const dialogo = screen.getByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText('CPF'), '52998224725');
    await usuario.type(within(dialogo).getByLabelText('Nome completo'), 'Maria Souza');
    await usuario.type(within(dialogo).getByLabelText('E-mail'), 'maria@exemplo.example');
    await usuario.type(within(dialogo).getByLabelText('Telefone'), '11999990000');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('CPF/CNPJ já cadastrado');
  });

  it('ATENDIMENTO edita contato mas não corrige o CPF (campo só leitura)', async () => {
    const corpos: unknown[] = [];
    instalarApiFalsa({
      'GET /auth/me': sessao('ATENDIMENTO'),
      'GET /clientes': () => json(paginado([clienteCompleto])),
      'PATCH /clientes/cliente-1': ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: clienteCompleto });
      },
    });
    renderizarApp('/painel/clientes');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Editar Maria Souza' }));
    const dialogo = screen.getByRole('dialog', { name: 'Editar cliente' });
    expect(within(dialogo).getByLabelText('CPF')).toHaveAttribute('readonly');
    await usuario.clear(within(dialogo).getByLabelText('Telefone'));
    await usuario.type(within(dialogo).getByLabelText('Telefone'), '11988887777');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(corpos).toHaveLength(1));
    expect(corpos[0]).toMatchObject({ telefone: '11988887777', cidade: 'São Paulo', cep: null });
    expect(corpos[0]).not.toHaveProperty('cpfCnpj');
  });

  it('inativar cliente com OS em aberto mostra a regra RN36', async () => {
    instalarApiFalsa({
      'GET /auth/me': sessao('GESTOR'),
      'GET /clientes': () => json(paginado([clienteCompleto])),
      'DELETE /clientes/cliente-1': () =>
        erroApi(422, 'RN36', 'Cliente possui ordens de serviço não encerradas e não pode ser inativado'),
    });
    renderizarApp('/painel/clientes');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: 'Inativar Maria Souza' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Inativar' }));

    expect(await screen.findByText(/não pode ser inativado \(RN36\)/)).toBeInTheDocument();
  });
});

describe('Veículos', () => {
  it('valida placa, chassi e anos e envia normalizado', async () => {
    const corpos: unknown[] = [];
    instalarApiFalsa({
      'GET /auth/me': sessao('ATENDIMENTO'),
      'GET /veiculos': () => json(paginado([])),
      'GET /clientes': () => json(paginado([clienteCompleto])),
      'POST /veiculos': ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: {} }, 201);
      },
    });
    renderizarApp('/painel/veiculos');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: /Novo veículo/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Novo veículo' });
    await usuario.type(within(dialogo).getByLabelText('Placa'), 'bra-2e19');
    await usuario.type(within(dialogo).getByLabelText('Chassi'), '9bwzzz377vt00425O'); // "O" é proibido
    await usuario.type(within(dialogo).getByLabelText('Marca'), 'Toyota');
    await usuario.type(within(dialogo).getByLabelText('Modelo'), 'Corolla');
    await usuario.clear(within(dialogo).getByLabelText('Ano-modelo'));
    await usuario.type(within(dialogo).getByLabelText('Ano-modelo'), '2020');
    await usuario.type(within(dialogo).getByLabelText('Cor'), 'Preto');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText(/Chassi inválido/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/Ano-modelo deve ser igual/)).toBeInTheDocument();
    expect(within(dialogo).getByText('Selecione o proprietário')).toBeInTheDocument();

    await usuario.clear(within(dialogo).getByLabelText('Chassi'));
    await usuario.type(within(dialogo).getByLabelText('Chassi'), '9bwzzz377vt004251');
    await usuario.clear(within(dialogo).getByLabelText('Ano-modelo'));
    await usuario.type(within(dialogo).getByLabelText('Ano-modelo'), String(new Date().getFullYear()));
    await usuario.type(within(dialogo).getByLabelText('Buscar proprietário pelo nome'), 'maria');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Buscar proprietário' }));
    await waitFor(() =>
      expect(within(dialogo).getByRole('option', { name: 'Maria Souza' })).toBeInTheDocument(),
    );
    await usuario.selectOptions(within(dialogo).getByLabelText('Proprietário'), 'cliente-1');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(corpos).toHaveLength(1));
    expect(corpos[0]).toMatchObject({
      placa: 'BRA2E19',
      chassi: '9BWZZZ377VT004251',
      clienteId: 'cliente-1',
    });
  });
});

describe('Usuários e configurações', () => {
  it('rotas exclusivas: GESTOR não acessa usuários; ATENDIMENTO não acessa configurações', async () => {
    instalarApiFalsa({ 'GET /auth/me': sessao('GESTOR') });
    const { unmount } = renderizarApp('/painel/usuarios');
    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
    unmount();

    instalarApiFalsa({ 'GET /auth/me': sessao('ATENDIMENTO') });
    renderizarApp('/painel/modelos-etapa');
    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
  });

  it('novo usuário de portal exige o cliente vinculado e senha forte', async () => {
    const corpos: unknown[] = [];
    instalarApiFalsa({
      'GET /auth/me': sessao('ADMIN'),
      'GET /usuarios': () => json(paginado([])),
      'GET /clientes': () => json(paginado([clienteCompleto])),
      'POST /usuarios': ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: {} }, 201);
      },
    });
    renderizarApp('/painel/usuarios');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: /Novo usuário/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Novo usuário' });
    await usuario.type(within(dialogo).getByLabelText('Nome'), 'Maria Souza');
    await usuario.type(within(dialogo).getByLabelText('E-mail'), 'maria.portal@exemplo.example');
    await usuario.selectOptions(within(dialogo).getByLabelText('Perfil'), 'CLIENTE');
    await usuario.type(within(dialogo).getByLabelText('Senha'), 'fraca');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    expect(await within(dialogo).findByText(/pelo menos 10 caracteres/)).toBeInTheDocument();
    expect(within(dialogo).getByText(/Selecione o cliente vinculado/)).toBeInTheDocument();

    await usuario.clear(within(dialogo).getByLabelText('Senha'));
    await usuario.type(within(dialogo).getByLabelText('Senha'), 'SenhaForte2026');
    await usuario.type(within(dialogo).getByLabelText('Buscar cliente vinculado pelo nome'), 'maria');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Buscar cliente vinculado' }));
    await waitFor(() =>
      expect(within(dialogo).getByRole('option', { name: 'Maria Souza' })).toBeInTheDocument(),
    );
    await usuario.selectOptions(within(dialogo).getByLabelText('Cliente vinculado'), 'cliente-1');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(corpos).toHaveLength(1));
    expect(corpos[0]).toEqual({
      nome: 'Maria Souza',
      email: 'maria.portal@exemplo.example',
      senha: 'SenhaForte2026',
      perfil: 'CLIENTE',
      clienteId: 'cliente-1',
    });
  });

  it('ADMIN editando a si mesmo: perfil e situação não são enviados', async () => {
    const corpos: unknown[] = [];
    const proprio = {
      ...usuarioDe('ADMIN'),
      ativo: true,
      ultimoLoginEm: null,
      createdAt: '2026-11-01T12:00:00.000Z',
      updatedAt: '2026-11-01T12:00:00.000Z',
    };
    instalarApiFalsa({
      'GET /auth/me': sessao('ADMIN'),
      'GET /usuarios': () => json(paginado([proprio])),
      [`PATCH /usuarios/${proprio.id}`]: ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: proprio });
      },
    });
    renderizarApp('/painel/usuarios');
    const usuario = userEvent.setup();

    await usuario.click(await screen.findByRole('button', { name: `Editar ${proprio.nome}` }));
    const dialogo = screen.getByRole('dialog', { name: 'Editar usuário' });
    expect(within(dialogo).queryByLabelText('Usuário ativo')).not.toBeInTheDocument();
    expect(dialogo).toHaveTextContent('não pode alterar o próprio perfil');
    await usuario.clear(within(dialogo).getByLabelText('Nome'));
    await usuario.type(within(dialogo).getByLabelText('Nome'), 'Admin Renomeado');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(corpos).toEqual([{ nome: 'Admin Renomeado', email: proprio.email }]));
  });

  it('configurações: lista o modelo de etapas e cria nova etapa', async () => {
    const corpos: unknown[] = [];
    instalarApiFalsa({
      'GET /auth/me': sessao('GESTOR'),
      'GET /modelos-etapa': () =>
        json({
          data: [
            {
              id: 'm-1',
              codigo: 'RECEPCAO',
              nome: 'Recepção',
              descricao: 'Recebimento do veículo',
              ordem: 10,
              obrigatoria: true,
              ativo: true,
              createdAt: '2026-11-01T12:00:00.000Z',
              updatedAt: '2026-11-01T12:00:00.000Z',
            },
          ],
        }),
      'POST /modelos-etapa': ({ corpo }) => {
        corpos.push(corpo);
        return json({ data: {} }, 201);
      },
    });
    renderizarApp('/painel/modelos-etapa');
    const usuario = userEvent.setup();

    expect(await screen.findByText('Recepção')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Nova etapa/ }));
    const dialogo = screen.getByRole('dialog', { name: 'Nova etapa' });
    await usuario.type(within(dialogo).getByLabelText('Código'), 'polimento');
    await usuario.type(within(dialogo).getByLabelText('Nome'), 'Polimento');
    await usuario.clear(within(dialogo).getByLabelText('Ordem'));
    await usuario.type(within(dialogo).getByLabelText('Ordem'), '55');
    await usuario.click(within(dialogo).getByLabelText('Obrigatória'));
    await usuario.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(corpos).toHaveLength(1));
    expect(corpos[0]).toEqual({ codigo: 'POLIMENTO', nome: 'Polimento', ordem: 55, obrigatoria: false });
  });
});
