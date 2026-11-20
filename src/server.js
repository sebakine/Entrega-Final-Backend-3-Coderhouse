import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 8080;

const start = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('Falta la variable de entorno JWT_SECRET');
    }
    await connectDB();
    app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
};

start();
