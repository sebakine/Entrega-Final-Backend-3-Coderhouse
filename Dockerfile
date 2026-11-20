# Imagen base oficial de Node.js (versión fija para builds reproducibles)
FROM node:24-slim

# Entorno de producción por defecto
ENV NODE_ENV=production \
    PORT=8080

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Primero solo los manifiestos: si no cambian, Docker reutiliza la capa de dependencias
COPY package.json package-lock.json ./

# Instalación reproducible desde package-lock.json, sin dependencias de desarrollo
RUN npm ci --omit=dev && npm cache clean --force

# Código fuente de la aplicación
COPY src ./src

# Se ejecuta con el usuario sin privilegios que trae la imagen oficial
USER node

EXPOSE 8080

CMD ["node", "src/server.js"]
