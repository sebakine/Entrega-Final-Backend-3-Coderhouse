import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import { initializePassport } from './config/passport.config.js';
import { swaggerSpecs } from './config/swagger.config.js';
import sessionsRouter from './routes/sessions.router.js';
import usersRouter from './routes/users.router.js';
import petsRouter from './routes/pets.router.js';
import adoptionsRouter from './routes/adoption.router.js';
import mocksRouter from './routes/mocks.router.js';

// La app se exporta sin escuchar en un puerto: así los tests pueden usarla con supertest.
// El arranque del servidor (conexión a Mongo + listen) vive en src/server.js
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport: las estrategias se definen en src/config/passport.config.js
initializePassport();
app.use(passport.initialize());

// Documentación Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use('/api/sessions', sessionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/pets', petsRouter);
app.use('/api/adoptions', adoptionsRouter);
app.use('/api/mocks', mocksRouter);

app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Ruta no encontrada' });
});

// JSON mal formado u otros errores no controlados
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ status: 'error', message: 'JSON inválido' });
  }
  console.error(err);
  return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
});

export default app;
