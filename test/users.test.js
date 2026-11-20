import { expect } from 'chai';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { UserModel } from '../src/models/User.js';

const requester = supertest(app);

describe('Tests funcionales del módulo Users (/api/users) y Swagger', function () {
  let mongoServer;
  let user;

  before(async function () {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  after(async function () {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async function () {
    await UserModel.deleteMany({});
    user = await UserModel.create({
      first_name: 'Ana',
      last_name: 'Pérez',
      email: 'ana@mail.com',
      password: 'hash',
    });
  });

  it('GET /api/users devuelve los usuarios sin password', async function () {
    const { status, body } = await requester.get('/api/users');
    expect(status).to.equal(200);
    expect(body.payload).to.have.lengthOf(1);
    expect(body.payload[0]).to.not.have.property('password');
  });

  it('GET /api/users/:uid devuelve 200, 404 y 400 según el caso', async function () {
    await requester.get(`/api/users/${user._id}`).expect(200);
    await requester.get(`/api/users/${new mongoose.Types.ObjectId()}`).expect(404);
    await requester.get('/api/users/xyz').expect(400);
  });

  it('PUT /api/users/:uid actualiza los campos permitidos y valida el rol', async function () {
    const { status, body } = await requester
      .put(`/api/users/${user._id}`)
      .send({ first_name: 'Ana María', role: 'admin', email: 'otro@mail.com' });
    expect(status).to.equal(200);
    expect(body.payload.first_name).to.equal('Ana María');
    expect(body.payload.role).to.equal('admin');
    expect(body.payload.email).to.equal('ana@mail.com');

    await requester.put(`/api/users/${user._id}`).send({ role: 'root' }).expect(400);
    await requester.put(`/api/users/${user._id}`).send({}).expect(400);
  });

  it('DELETE /api/users/:uid elimina el usuario', async function () {
    await requester.delete(`/api/users/${user._id}`).expect(200);
    await requester.delete(`/api/users/${user._id}`).expect(404);
    expect(await UserModel.countDocuments()).to.equal(0);
  });

  it('GET /api/docs sirve la documentación de Swagger', async function () {
    const { status, text } = await requester.get('/api/docs/');
    expect(status).to.equal(200);
    expect(text).to.include('swagger-ui');
  });
});
