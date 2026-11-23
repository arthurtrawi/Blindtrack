import { z } from 'zod';
import {
  normalizarChassi,
  normalizarPlaca,
  REGEX_CHASSI,
  REGEX_PLACA,
} from '../utils/veiculo-identificacao.js';
import { paginacaoSchema, textoSchema } from './comum.schema.js';

const ANO_MINIMO = 1950;
const anoMaximo = (): number => new Date().getUTCFullYear() + 1;

const placaSchema = z
  .string('Placa é obrigatória')
  .transform(normalizarPlaca)
  .refine((v) => REGEX_PLACA.test(v), 'Placa inválida (formatos aceitos: ABC1234 ou ABC1D23)');

const chassiSchema = z
  .string('Chassi é obrigatório')
  .transform(normalizarChassi)
  .refine((v) => REGEX_CHASSI.test(v), 'Chassi inválido (17 caracteres, sem as letras I, O e Q)');

const anoSchema = (campo: string) =>
  z.coerce
    .number(`${campo} deve ser numérico`)
    .int()
    .min(ANO_MINIMO, `${campo} deve ser a partir de ${ANO_MINIMO}`)
    .refine((ano) => ano <= anoMaximo(), `${campo} não pode ser posterior a ${anoMaximo()}`);

/** O ano-modelo é igual ao ano de fabricação ou o seguinte (regra do mercado brasileiro). */
const anosCoerentes = (d: { anoFabricacao?: number; anoModelo?: number }): boolean =>
  d.anoFabricacao === undefined ||
  d.anoModelo === undefined ||
  (d.anoModelo >= d.anoFabricacao && d.anoModelo <= d.anoFabricacao + 1);

const MENSAGEM_ANOS = {
  message: 'anoModelo deve ser igual ao anoFabricacao ou o ano seguinte',
  path: ['anoModelo'],
};

export const criarVeiculoSchema = z
  .strictObject({
    placa: placaSchema,
    chassi: chassiSchema,
    marca: textoSchema(2, 50, 'Marca'),
    modelo: textoSchema(1, 80, 'Modelo'),
    anoFabricacao: anoSchema('anoFabricacao'),
    anoModelo: anoSchema('anoModelo'),
    cor: textoSchema(3, 30, 'Cor'),
    clienteId: z.uuid('clienteId inválido'),
  })
  .refine(anosCoerentes, MENSAGEM_ANOS);
export type CriarVeiculoInput = z.infer<typeof criarVeiculoSchema>;

export const atualizarVeiculoSchema = z
  .strictObject({
    placa: placaSchema.optional(),
    chassi: chassiSchema.optional(),
    marca: textoSchema(2, 50, 'Marca').optional(),
    modelo: textoSchema(1, 80, 'Modelo').optional(),
    anoFabricacao: anoSchema('anoFabricacao').optional(),
    anoModelo: anoSchema('anoModelo').optional(),
    cor: textoSchema(3, 30, 'Cor').optional(),
    /** Transferência de proprietário: só sem OS ativa (RF12). */
    clienteId: z.uuid('clienteId inválido').optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Informe ao menos um campo para atualizar')
  .refine(anosCoerentes, MENSAGEM_ANOS);
export type AtualizarVeiculoInput = z.infer<typeof atualizarVeiculoSchema>;

export const listarVeiculosSchema = paginacaoSchema.extend({
  /** Placa exata ou prefixo (aceita hífen). */
  placa: z.string().transform(normalizarPlaca).optional(),
  chassi: z.string().transform(normalizarChassi).optional(),
  clienteId: z.uuid('clienteId inválido').optional(),
  /** Busca parcial em marca ou modelo. */
  busca: z.string().trim().min(2).max(80).optional(),
});
export type ListarVeiculosQuery = z.infer<typeof listarVeiculosSchema>;
