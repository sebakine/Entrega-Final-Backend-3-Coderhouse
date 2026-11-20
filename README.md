# Entrega Final — Backend 3 (Coderhouse): API de Adopciones dockerizada

API en **Node.js + Express + MongoDB (Mongoose)** para gestionar usuarios, mascotas y adopciones. Incluye generación de datos de prueba (mocks), documentación **Swagger** del módulo Users, **tests funcionales** del router de adopciones y una **imagen de Docker** publicada en Docker Hub.

**Autor:** Sebastián Felipe Muñoz Rivera

---

## 🐳 Imagen en Docker Hub

**https://hub.docker.com/r/sebakine/entrega-final-backend-3**

```bash
docker pull sebakine/entrega-final-backend-3:1.0.0
```

| Tag      | Descripción                     |
| -------- | ------------------------------- |
| `1.0.0`  | Versión de la entrega final     |
| `latest` | Apunta a la última versión      |

---

## Tecnologías

- Node.js 24 (ES Modules) y Express 5
- MongoDB con Mongoose
- Passport.js + JWT en cookie HTTP Only
- bcrypt
- @faker-js/faker (mocks)
- **swagger-jsdoc + swagger-ui-express** (documentación)
- **Mocha + Chai + Supertest + mongodb-memory-server** (tests funcionales)
- **Docker** y Docker Compose

## Estructura del proyecto

```
├── src/
│   ├── app.js                       # app Express (rutas, Swagger, errores); se exporta para los tests
│   ├── server.js                    # punto de entrada: conecta a Mongo y escucha en PORT
│   ├── config/
│   │   ├── db.js                    # conexión a MongoDB
│   │   ├── passport.config.js       # estrategias register, login y current
│   │   └── swagger.config.js        # configuración de swagger-jsdoc
│   ├── docs/
│   │   └── Users/Users.yaml         # documentación Swagger del módulo Users
│   ├── models/                      # User, Pet, Adoption
│   ├── routes/
│   │   ├── users.router.js          # /api/users
│   │   ├── pets.router.js           # /api/pets
│   │   ├── adoption.router.js       # /api/adoptions
│   │   ├── mocks.router.js          # /api/mocks
│   │   └── sessions.router.js       # /api/sessions
│   ├── controllers/
│   ├── mocks/mocking.js             # generateUsers(n) y generatePets(n)
│   ├── middlewares/
│   └── utils/
├── test/
│   ├── adoption.test.js             # tests funcionales de adoption.router.js
│   └── users.test.js                # tests del módulo Users y de /api/docs
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
└── package.json
```

---

## Ejecutar con Docker

### Opción 1 — Imagen de Docker Hub + Docker Compose (recomendada)

`docker-compose.yml` levanta la API y una base MongoDB:

```bash
git clone https://github.com/sebakine/Entrega-Final-Backend-3-Coderhouse.git
cd Entrega-Final-Backend-3-Coderhouse
docker compose pull app      # descarga la imagen desde Docker Hub
docker compose up -d         # levanta MongoDB + API
```

- API: `http://localhost:8080`
- Swagger: `http://localhost:8080/api/docs`

Para usar una clave JWT propia: `JWT_SECRET=mi_clave docker compose up -d`. Para detener todo: `docker compose down`.

### Opción 2 — Solo el contenedor, con una base MongoDB propia (por ejemplo Atlas)

```bash
docker pull sebakine/entrega-final-backend-3:1.0.0

docker run -d --name adoptme -p 8080:8080 \
  -e MONGO_URL="mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/<base>" \
  -e JWT_SECRET="<clave_secreta>" \
  sebakine/entrega-final-backend-3:1.0.0
```

O con un archivo de variables: `docker run -d -p 8080:8080 --env-file .env sebakine/entrega-final-backend-3:1.0.0`.

### Construir la imagen localmente

```bash
docker build -t sebakine/entrega-final-backend-3:1.0.0 .
docker run -d -p 8080:8080 --env-file .env sebakine/entrega-final-backend-3:1.0.0
```

### Publicar la imagen en Docker Hub

```bash
docker login
docker tag sebakine/entrega-final-backend-3:1.0.0 sebakine/entrega-final-backend-3:latest
docker push sebakine/entrega-final-backend-3:1.0.0
docker push sebakine/entrega-final-backend-3:latest
```

### Qué hace el Dockerfile

| Paso                                       | Para qué                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `FROM node:24-slim`                        | Imagen oficial de Node con versión fija                                      |
| `ENV NODE_ENV=production PORT=8080`        | Entorno de ejecución de producción                                           |
| `WORKDIR /app`                             | Directorio de la aplicación                                                  |
| `COPY package.json package-lock.json ./`   | Copia primero los manifiestos para cachear la capa de dependencias           |
| `RUN npm ci --omit=dev`                    | Instalación **reproducible** desde el lockfile, sin dependencias de desarrollo |
| `COPY src ./src`                           | Copia el código fuente                                                       |
| `USER node`                                | Ejecuta sin privilegios de root                                              |
| `EXPOSE 8080` / `CMD ["node", "src/server.js"]` | Puerto y comando de arranque                                            |

`.dockerignore` excluye `node_modules`, `.env`, `.git` y los tests, por lo que **ninguna credencial queda dentro de la imagen**: las variables se pasan al ejecutar el contenedor.

---

## Ejecutar sin Docker

```bash
npm install
cp .env.example .env    # completar con los valores reales
npm start               # o: npm run dev
```

### Variables de entorno

| Variable         | Descripción                                    | Requerida |
| ---------------- | ---------------------------------------------- | --------- |
| `MONGO_URL`      | Cadena de conexión a MongoDB                   | Sí        |
| `JWT_SECRET`     | Clave secreta para firmar los JWT              | Sí        |
| `PORT`           | Puerto del servidor (por defecto `8080`)       | No        |
| `JWT_EXPIRES_IN` | Expiración del JWT (por defecto `1h`)          | No        |
| `NODE_ENV`       | `development` o `production`                   | No        |

---

## Tests funcionales

```bash
npm test
```

Los tests usan **Mocha + Chai + Supertest** contra la app real y una base **MongoDB en memoria** (`mongodb-memory-server`), así que no necesitan una base externa ni modifican datos reales. Resultado actual: **17 passing**.

### Cobertura de `adoption.router.js`

| Endpoint                         | Casos probados                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `GET /api/adoptions`             | 200 con lista vacía · 200 con todas las adopciones                                                                |
| `GET /api/adoptions/:aid`        | 200 adopción existente · 404 inexistente · 400 id inválido                                                        |
| `POST /api/adoptions/:uid/:pid`  | 201 crea la adopción y marca la mascota como adoptada, le asigna dueño y la agrega a `user.pets` · la adopción creada se obtiene por GET · 400 mascota ya adoptada (sin crear otra adopción) · 404 usuario inexistente · 404 mascota inexistente · 400 id de usuario inválido · 400 id de mascota inválido |

También hay tests del módulo Users (GET, PUT, DELETE) y de que `/api/docs` sirve Swagger.

---

## Documentación Swagger (módulo Users)

Disponible en **`http://localhost:8080/api/docs`**. La definición está en `src/docs/Users/Users.yaml`.

| Método | Path              | Descripción                                                    |
| ------ | ----------------- | -------------------------------------------------------------- |
| GET    | `/api/users`      | Lista todos los usuarios (sin `password`)                      |
| GET    | `/api/users/:uid` | Obtiene un usuario · 400 id inválido · 404 inexistente         |
| PUT    | `/api/users/:uid` | Actualiza `first_name`, `last_name` y/o `role` · 400 / 404     |
| DELETE | `/api/users/:uid` | Elimina un usuario · 400 / 404                                 |

Se documentan los esquemas `User`, `UpdateUser` y `Error`, los parámetros y todas las respuestas posibles con ejemplos.

---

## Endpoints

### Adopciones — `/api/adoptions`

| Método | Path              | Descripción                                    |
| ------ | ----------------- | ---------------------------------------------- |
| GET    | `/`               | Lista las adopciones                           |
| GET    | `/:aid`           | Obtiene una adopción                           |
| POST   | `/:uid/:pid`      | El usuario `uid` adopta la mascota `pid`       |

Ejemplo `POST /api/adoptions/6b00.../6b00...` → `201`:

```json
{
  "status": "success",
  "message": "Mascota adoptada",
  "payload": { "_id": "6b00c1...", "owner": "6b00c1bb56a28ca89ec4f1fe", "pet": "6b00c1bb56a28ca89ec4f202" }
}
```

### Mascotas — `/api/pets`

`GET /` lista las mascotas y `GET /:pid` obtiene una.

### Mocks — `/api/mocks`

| Método | Path             | Descripción                                                                     |
| ------ | ---------------- | ------------------------------------------------------------------------------- |
| GET    | `/mockingpets`   | Genera mascotas falsas (100 por defecto, `?quantity=N`). No inserta.            |
| GET    | `/mockingusers`  | Genera 50 usuarios con formato de Mongo (`?quantity=N`): password `coder123` encriptada, rol `user`/`admin`, `pets: []`. No inserta. |
| POST   | `/generateData`  | Body `{ "users": N, "pets": M }`: genera e **inserta** los registros.           |

### Sesiones — `/api/sessions`

`POST /register`, `POST /login`, `GET /current` y `POST /logout`, con estrategias de Passport y JWT en la cookie HTTP Only `currentUser`.

---

## Prueba rápida con el contenedor

```bash
# 1. Generar datos
curl -X POST localhost:8080/api/mocks/generateData -H "Content-Type: application/json" -d '{"users":2,"pets":2}'
# 2. Tomar un id de usuario y uno de mascota
curl localhost:8080/api/users
curl localhost:8080/api/pets
# 3. Adoptar
curl -X POST localhost:8080/api/adoptions/<uid>/<pid>
# 4. Ver adopciones
curl localhost:8080/api/adoptions
```
