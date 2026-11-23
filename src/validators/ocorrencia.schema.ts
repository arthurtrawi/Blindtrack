import { z } from 'zod';
import { ACOES_OCORRENCIA } from '../services/domain/ocorrencia.state-machine.js';
import { dataHoraSchema, textoSchema } from './comum.schema.js';

const TIPOS = ['AGUARDANDO_PECA', 'PENDENCIA_DOCUMENTAL', 'RETRABALHO', 'ATRASO', 'OUTROS'] as const;
const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const;
const STATUS = ['ABERTA', 'EM_TRATAMENTO', 'RESOLVIDA', 'CANCELADA'] as const;

const tipoSchema = z.enum(TIPOS, `tipo deve ser um de: ${TIPOS.join(', ')}`);
const prioridadeSchema = z.enum(PRIORIDADES, `prioridade deve ser uma de: ${PRIORIDADES.join(', ')}`);

/** Visível ao cliente exige um texto próprio para ele (a descrição interna nunca é exposta). */
const textoClienteCoerente = (d: { visivelCliente?: boolean; descricaoCliente?: string | null }) =>
  !d.visivelCliente || Boolean(d.descricaoCliente?.trim());
const MENSAGEM_TEXTO_CLIENTE = {
  message: 'descricaoCliente é obrigatória quando a ocorrência é visível ao cliente',
  path: ['descricaoCliente'],
};

export const abrirOcorrenciaSchema = z
  .strictObject({
    titulo: textoSchema(3, 150, 'Título'),
    descricao: textoSchema(5, 5000, 'Descrição'),
    tipo: tipoSchema,
    prioridade: prioridadeSchema.default('MEDIA'),
    etapaProcessoId: z.uuid('etapaProcessoId inválido').optional(),
    usuarioResponsavelId: z.uuid('usuarioResponsavelId inválido'),
    impeditiva: z.boolean().default(false),
    visivelCliente: z.boolean().default(false),
    descricaoCliente: textoSchema(5, 1000, 'Descrição para o cliente').optional(),
    /** Replaneja a entrega da OS por causa desta ocorrência (RN23, só ADMIN/GESTOR). */
    novaPrevisaoEntrega: dataHoraSchema.optional(),
  })
  .refine(textoClienteCoerente, MENSAGEM_TEXTO_CLIENTE);
export type AbrirOcorrenciaInput = z.infer<typeof abrirOcorrenciaSchema>;

export const atualizarOcorrenciaSchema = z
  .strictObject({
    titulo: textoSchema(3, 150, 'Título').optional(),
    descricao: textoSchema(5, 5000, 'Descrição').optional(),
    prioridade: prioridadeSchema.optional(),
    impeditiva: z.boolean().optional(),
    usuarioResponsavelId: z.uuid('usuarioResponsavelId inválido').optional(),
    visivelCliente: z.boolean().optional(),
    descricaoCliente: textoSchema(5, 1000, 'Descrição para o cliente').nullable().optional(),
    /** Transição de status (RN21). */
    acao: z.enum(ACOES_OCORRENCIA, `acao deve ser uma de: ${ACOES_OCORRENCIA.join(', ')}`).optional(),
    solucao: textoSchema(5, 5000, 'Solução').optional(),
    motivo: textoSchema(5, 1000, 'Motivo').optional(),
  })
  .refine((d) => Object.keys(d).length > 0, 'Informe ao menos um campo para atualizar');
export type AtualizarOcorrenciaInput = z.infer<typeof atualizarOcorrenciaSchema>;

export const listarOcorrenciasSchema = z.object({
  status: z.enum(STATUS, 'Status inválido').optional(),
  tipo: tipoSchema.optional(),
  prioridade: prioridadeSchema.optional(),
});
export type ListarOcorrenciasQuery = z.infer<typeof listarOcorrenciasSchema>;
