import { z } from 'zod';
import { tipoPessoaDoDocumento } from '../utils/documento.js';
import {
  booleanoQuerySchema,
  cepSchema,
  documentoSchema,
  emailSchema,
  paginacaoSchema,
  telefoneSchema,
  textoSchema,
  ufSchema,
} from './comum.schema.js';

const tipoPessoaSchema = z.enum(['FISICA', 'JURIDICA'], 'tipoPessoa deve ser FISICA ou JURIDICA');

/** Campos de endereço: todos opcionais (minimização de dados, LGPD). */
const enderecoCampos = {
  cep: cepSchema,
  logradouro: textoSchema(2, 150, 'Logradouro'),
  numero: textoSchema(1, 10, 'Número'),
  complemento: textoSchema(1, 60, 'Complemento'),
  bairro: textoSchema(2, 80, 'Bairro'),
  cidade: textoSchema(2, 80, 'Cidade'),
  uf: ufSchema,
};

export const criarClienteSchema = z
  .strictObject({
    tipoPessoa: tipoPessoaSchema,
    nome: textoSchema(3, 150, 'Nome'),
    cpfCnpj: documentoSchema,
    email: emailSchema,
    telefone: telefoneSchema,
    cep: enderecoCampos.cep.optional(),
    logradouro: enderecoCampos.logradouro.optional(),
    numero: enderecoCampos.numero.optional(),
    complemento: enderecoCampos.complemento.optional(),
    bairro: enderecoCampos.bairro.optional(),
    cidade: enderecoCampos.cidade.optional(),
    uf: enderecoCampos.uf.optional(),
  })
  .superRefine((dados, ctx) => {
    const tipo = tipoPessoaDoDocumento(dados.cpfCnpj);
    if (tipo && tipo !== dados.tipoPessoa) {
      ctx.addIssue({
        code: 'custom',
        path: ['cpfCnpj'],
        message: dados.tipoPessoa === 'FISICA' ? 'Pessoa física exige CPF' : 'Pessoa jurídica exige CNPJ',
      });
    }
  });
export type CriarClienteInput = z.infer<typeof criarClienteSchema>;

/**
 * Atualização parcial. Os campos de endereço aceitam `null` para remover o valor.
 * O tipo de pessoa não muda (é outra pessoa). O CPF/CNPJ pode ser corrigido, e o
 * service confere a coerência com o tipo gravado.
 */
export const atualizarClienteSchema = z
  .strictObject({
    nome: textoSchema(3, 150, 'Nome').optional(),
    cpfCnpj: documentoSchema.optional(),
    email: emailSchema.optional(),
    telefone: telefoneSchema.optional(),
    cep: enderecoCampos.cep.nullable().optional(),
    logradouro: enderecoCampos.logradouro.nullable().optional(),
    numero: enderecoCampos.numero.nullable().optional(),
    complemento: enderecoCampos.complemento.nullable().optional(),
    bairro: enderecoCampos.bairro.nullable().optional(),
    cidade: enderecoCampos.cidade.nullable().optional(),
    uf: enderecoCampos.uf.nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Informe ao menos um campo para atualizar');
export type AtualizarClienteInput = z.infer<typeof atualizarClienteSchema>;

export const listarClientesSchema = paginacaoSchema.extend({
  /** Busca parcial, sem diferenciar maiúsculas e minúsculas. */
  nome: z.string().trim().min(2).max(150).optional(),
  /** CPF/CNPJ exato (aceita pontuação). */
  documento: z
    .string()
    .transform((v) => v.replace(/[.\-/\s]/g, '').toUpperCase())
    .optional(),
  email: z.string().trim().toLowerCase().min(3).max(254).optional(),
  tipoPessoa: tipoPessoaSchema.optional(),
  /** Inclui clientes inativados (somente ADMIN e GESTOR). */
  incluirInativos: booleanoQuerySchema.optional(),
});
export type ListarClientesQuery = z.infer<typeof listarClientesSchema>;
