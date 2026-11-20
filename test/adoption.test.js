import { expect } from 'chai';
import supertest from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { UserModel } from '../src/models/User.js';
import { PetModel } from '../src/models/Pet.js';
import { AdoptionModel } from '../src/models/Adoption.js';

const requester = supertest(app);

// Ids con formato válido que no existen en la base
const missingId = () => new mongoose.Types.ObjectId().toString();

describe('Tests funcionales del router de adopciones (/api/adoptions)', function () {
  let mongoServer;

  before(async function () {
    // Base de datos en memoria: los tests no dependen de una instancia externa ni la ensucian
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  after(async function () {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async function () {
    await Promise.all([
      UserModel.deleteMany({}),
      PetModel.deleteMany({}),
      AdoptionModel.deleteMany({}),
    ]);
  });

  const createUser = (overrides = {}) =>
    UserModel.create({
      first_name: 'Ana',
      last_name: 'Pérez',
      email: `ana.${new mongoose.Types.ObjectId()}@mail.com`,
      password: 'hash',
      ...overrides,
    });

  const createPet = (overrides = {}) =>
    PetModel.create({ name: 'Firulais', specie: 'perro', birthDate: new Date('2020-01-01'), ...overrides });

  /* ------------------------------------------------------------------ */
  describe('GET /api/adoptions', function () {
    it('devuelve 200 y un array vacío cuando no hay adopciones', async function () {
      const { status, body } = await requester.get('/api/adoptions');

      expect(status).to.equal(200);
      expect(body.status).to.equal('success');
      expect(body.payload).to.be.an('array').that.is.empty;
      expect(body.count).to.equal(0);
    });

    it('devuelve 200 y todas las adopciones registradas', async function () {
      const user = await createUser();
      const [pet1, pet2] = await Promise.all([createPet(), createPet({ name: 'Michi', specie: 'gato' })]);
      await AdoptionModel.create([
        { owner: user._id, pet: pet1._id },
        { owner: user._id, pet: pet2._id },
      ]);

      const { status, body } = await requester.get('/api/adoptions');

      expect(status).to.equal(200);
      expect(body.payload).to.have.lengthOf(2);
      expect(body.count).to.equal(2);
      body.payload.forEach((adoption) => {
        expect(adoption).to.include.keys('_id', 'owner', 'pet');
        expect(adoption.owner).to.equal(user._id.toString());
      });
    });
  });

  /* ------------------------------------------------------------------ */
  describe('GET /api/adoptions/:aid', function () {
    it('devuelve 200 y la adopción cuando el id existe', async function () {
      const user = await createUser();
      const pet = await createPet();
      const adoption = await AdoptionModel.create({ owner: user._id, pet: pet._id });

      const { status, body } = await requester.get(`/api/adoptions/${adoption._id}`);

      expect(status).to.equal(200);
      expect(body.status).to.equal('success');
      expect(body.payload._id).to.equal(adoption._id.toString());
      expect(body.payload.owner).to.equal(user._id.toString());
      expect(body.payload.pet).to.equal(pet._id.toString());
    });

    it('devuelve 404 cuando la adopción no existe', async function () {
      const { status, body } = await requester.get(`/api/adoptions/${missingId()}`);

      expect(status).to.equal(404);
      expect(body).to.deep.equal({ status: 'error', message: 'Adopción no encontrada' });
    });

    it('devuelve 400 cuando el id no es un ObjectId válido', async function () {
      const { status, body } = await requester.get('/api/adoptions/id-invalido');

      expect(status).to.equal(400);
      expect(body).to.deep.equal({ status: 'error', message: 'Id de adopción inválido' });
    });
  });

  /* ------------------------------------------------------------------ */
  describe('POST /api/adoptions/:uid/:pid', function () {
    it('devuelve 201, crea la adopción y actualiza la mascota y el usuario', async function () {
      const user = await createUser();
      const pet = await createPet();

      const { status, body } = await requester.post(`/api/adoptions/${user._id}/${pet._id}`);

      expect(status).to.equal(201);
      expect(body.status).to.equal('success');
      expect(body.message).to.equal('Mascota adoptada');
      expect(body.payload.owner).to.equal(user._id.toString());
      expect(body.payload.pet).to.equal(pet._id.toString());

      // Efectos en la base de datos
      const adoption = await AdoptionModel.findById(body.payload._id);
      expect(adoption).to.not.be.null;

      const updatedPet = await PetModel.findById(pet._id);
      expect(updatedPet.adopted).to.be.true;
      expect(updatedPet.owner.toString()).to.equal(user._id.toString());

      const updatedUser = await UserModel.findById(user._id);
      expect(updatedUser.pets.map(String)).to.include(pet._id.toString());
    });

    it('la adopción creada se puede consultar luego por GET', async function () {
      const user = await createUser();
      const pet = await createPet();

      const created = await requester.post(`/api/adoptions/${user._id}/${pet._id}`);
      const { status, body } = await requester.get(`/api/adoptions/${created.body.payload._id}`);

      expect(status).to.equal(200);
      expect(body.payload.pet).to.equal(pet._id.toString());
    });

    it('devuelve 400 si la mascota ya fue adoptada y no crea otra adopción', async function () {
      const [user, otherUser] = await Promise.all([createUser(), createUser()]);
      const pet = await createPet();
      await requester.post(`/api/adoptions/${user._id}/${pet._id}`).expect(201);

      const { status, body } = await requester.post(`/api/adoptions/${otherUser._id}/${pet._id}`);

      expect(status).to.equal(400);
      expect(body).to.deep.equal({ status: 'error', message: 'La mascota ya fue adoptada' });
      expect(await AdoptionModel.countDocuments()).to.equal(1);
      const unchangedPet = await PetModel.findById(pet._id);
      expect(unchangedPet.owner.toString()).to.equal(user._id.toString());
    });

    it('devuelve 404 si el usuario no existe', async function () {
      const pet = await createPet();

      const { status, body } = await requester.post(`/api/adoptions/${missingId()}/${pet._id}`);

      expect(status).to.equal(404);
      expect(body).to.deep.equal({ status: 'error', message: 'Usuario no encontrado' });
      expect(await AdoptionModel.countDocuments()).to.equal(0);
    });

    it('devuelve 404 si la mascota no existe', async function () {
      const user = await createUser();

      const { status, body } = await requester.post(`/api/adoptions/${user._id}/${missingId()}`);

      expect(status).to.equal(404);
      expect(body).to.deep.equal({ status: 'error', message: 'Mascota no encontrada' });
      expect(await AdoptionModel.countDocuments()).to.equal(0);
    });

    it('devuelve 400 si el id de usuario no es válido', async function () {
      const pet = await createPet();

      const { status, body } = await requester.post(`/api/adoptions/abc/${pet._id}`);

      expect(status).to.equal(400);
      expect(body).to.deep.equal({ status: 'error', message: 'Id de usuario inválido' });
    });

    it('devuelve 400 si el id de mascota no es válido', async function () {
      const user = await createUser();

      const { status, body } = await requester.post(`/api/adoptions/${user._id}/abc`);

      expect(status).to.equal(400);
      expect(body).to.deep.equal({ status: 'error', message: 'Id de mascota inválido' });
    });
  });
});
