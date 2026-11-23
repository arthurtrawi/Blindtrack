/**
 * Documento OpenAPI 3 base. Os endpoints de cada módulo são acrescentados nas Fases 4 e 5.
 */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'BlindTrack API',
    version: '0.1.0',
    description:
      'API de gestão e rastreabilidade de processos de blindagem automotiva. ' +
      'Sistema administrativo: não toma decisões técnicas, de certificação ou de conformidade legal.',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Erro: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Dados de entrada inválidos' },
              details: {},
              requestId: { type: 'string' },
            },
          },
        },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded'] },
          database: { type: 'string', enum: ['up', 'down'] },
          uptimeSeconds: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Infraestrutura'],
        summary: 'Verifica a disponibilidade da API e do banco de dados',
        responses: {
          '200': {
            description: 'API e banco disponíveis',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
          },
          '503': {
            description: 'Banco de dados indisponível',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
          },
        },
      },
    },
  },
} as const;
