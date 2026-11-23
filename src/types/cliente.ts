import type { DataISO, ParametrosPaginacao } from './api';

export type TipoPessoa = 'FISICA' | 'JURIDICA';

/** Visão completa (ADMIN, GESTOR, ATENDIMENTO). */
export interface Cliente {
  id: string;
  tipoPessoa: TipoPessoa;
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  createdAt: DataISO;
  updatedAt: DataISO;
  deletedAt: DataISO | null;
}

/** Visão reduzida para TECNICO: documento mascarado, sem contato nem endereço (LGPD). */
export interface ClienteResumido {
  id: string;
  tipoPessoa: TipoPessoa;
  nome: string;
  cpfCnpj: string;
}

export type ClienteVisivel = Cliente | ClienteResumido;

export function clienteCompleto(cliente: ClienteVisivel): cliente is Cliente {
  return 'email' in cliente;
}

/** GET /clientes/:id inclui os veículos. */
export type ClienteComVeiculos = ClienteVisivel & {
  veiculos: { id: string; placa: string; marca: string; modelo: string }[];
};

export interface FiltrosClientes extends ParametrosPaginacao {
  nome?: string;
  documento?: string;
  email?: string;
  tipoPessoa?: TipoPessoa;
  incluirInativos?: boolean;
}

export interface DadosEndereco {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

export interface NovoCliente extends DadosEndereco {
  tipoPessoa: TipoPessoa;
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
}

export type AlteracoesCliente = Partial<Omit<NovoCliente, 'tipoPessoa'>>;
