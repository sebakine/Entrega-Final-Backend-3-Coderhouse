import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJSDoc from 'swagger-jsdoc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const options = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'API Adopciones — Backend 3 Coderhouse',
      version: '1.0.0',
      description: 'Documentación del módulo de Users',
    },
  },
  // Las rutas se documentan en archivos YAML dentro de src/docs
  apis: [path.join(__dirname, '../docs/**/*.yaml').replace(/\\/g, '/')],
};

export const swaggerSpecs = swaggerJSDoc(options);
