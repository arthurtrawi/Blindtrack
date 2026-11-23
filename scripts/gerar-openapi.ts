/**
 * Exporta a especificação OpenAPI para docs/api/openapi.json.
 * Uso: npm run docs:openapi
 * O arquivo é versionado como evidência da documentação (e pode ser importado no Postman/Insomnia).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { OPERACOES, openApiDocument } from '../src/config/swagger.js';

const destino = path.resolve('docs/api/openapi.json');
mkdirSync(path.dirname(destino), { recursive: true });
writeFileSync(destino, `${JSON.stringify(openApiDocument, null, 2)}\n`);
console.log(`OpenAPI gerado em ${path.relative(process.cwd(), destino)} (${OPERACOES.length} operações)`);
