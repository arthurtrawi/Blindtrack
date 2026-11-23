import type { DataISO, ParametrosPaginacao, Referencia } from './api';

export interface Veiculo {
  id: string;
  placa: string;
  chassi: string;
  marca: string;
  modelo: string;
  anoFabricacao: number;
  anoModelo: number;
  cor: string;
  clienteId: string;
  createdAt: DataISO;
  updatedAt: DataISO;
  cliente: Referencia;
}

export interface FiltrosVeiculos extends ParametrosPaginacao {
  placa?: string;
  chassi?: string;
  clienteId?: string;
  busca?: string;
}

export interface NovoVeiculo {
  placa: string;
  chassi: string;
  marca: string;
  modelo: string;
  anoFabricacao: number;
  anoModelo: number;
  cor: string;
  clienteId: string;
}

export type AlteracoesVeiculo = Partial<NovoVeiculo>;
