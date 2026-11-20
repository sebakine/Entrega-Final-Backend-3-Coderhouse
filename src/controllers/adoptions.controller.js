import mongoose from 'mongoose';
import { AdoptionModel } from '../models/Adoption.js';
import { UserModel } from '../models/User.js';
import { PetModel } from '../models/Pet.js';

const badRequest = (res, message) => res.status(400).json({ status: 'error', message });
const notFound = (res, message) => res.status(404).json({ status: 'error', message });

// GET /api/adoptions
export const getAdoptions = async (_req, res) => {
  const adoptions = await AdoptionModel.find();
  return res.status(200).json({ status: 'success', count: adoptions.length, payload: adoptions });
};

// GET /api/adoptions/:aid
export const getAdoptionById = async (req, res) => {
  const { aid } = req.params;
  if (!mongoose.isValidObjectId(aid)) return badRequest(res, 'Id de adopción inválido');

  const adoption = await AdoptionModel.findById(aid);
  if (!adoption) return notFound(res, 'Adopción no encontrada');

  return res.status(200).json({ status: 'success', payload: adoption });
};

// POST /api/adoptions/:uid/:pid
// El usuario :uid adopta la mascota :pid
export const createAdoption = async (req, res) => {
  const { uid, pid } = req.params;
  if (!mongoose.isValidObjectId(uid)) return badRequest(res, 'Id de usuario inválido');
  if (!mongoose.isValidObjectId(pid)) return badRequest(res, 'Id de mascota inválido');

  const user = await UserModel.findById(uid);
  if (!user) return notFound(res, 'Usuario no encontrado');

  const pet = await PetModel.findById(pid);
  if (!pet) return notFound(res, 'Mascota no encontrada');

  // Se marca como adoptada de forma atómica para evitar dos adopciones simultáneas
  const adoptedPet = await PetModel.findOneAndUpdate(
    { _id: pid, adopted: false },
    { adopted: true, owner: user._id },
    { returnDocument: 'after' }
  );
  if (!adoptedPet) return badRequest(res, 'La mascota ya fue adoptada');

  await UserModel.updateOne({ _id: user._id }, { $addToSet: { pets: adoptedPet._id } });
  const adoption = await AdoptionModel.create({ owner: user._id, pet: adoptedPet._id });

  return res.status(201).json({ status: 'success', message: 'Mascota adoptada', payload: adoption });
};
