import mongoose from 'mongoose';
import { UserModel } from '../models/User.js';

const UPDATABLE_FIELDS = ['first_name', 'last_name', 'role'];
const ROLES = ['user', 'admin'];

const invalidId = (res) =>
  res.status(400).json({ status: 'error', message: 'Id de usuario inválido' });
const notFound = (res) =>
  res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });

// GET /api/users (la contraseña nunca se expone: ver transform en el modelo)
export const getUsers = async (_req, res) => {
  const users = await UserModel.find();
  return res.status(200).json({ status: 'success', count: users.length, payload: users });
};

// GET /api/users/:uid
export const getUserById = async (req, res) => {
  const { uid } = req.params;
  if (!mongoose.isValidObjectId(uid)) return invalidId(res);

  const user = await UserModel.findById(uid);
  if (!user) return notFound(res);

  return res.status(200).json({ status: 'success', payload: user });
};

// PUT /api/users/:uid  body: { first_name?, last_name?, role? }
export const updateUser = async (req, res) => {
  const { uid } = req.params;
  if (!mongoose.isValidObjectId(uid)) return invalidId(res);

  const body = req.body ?? {};
  const update = {};
  for (const field of UPDATABLE_FIELDS) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      return res
        .status(400)
        .json({ status: 'error', message: `"${field}" debe ser un texto no vacío` });
    }
    update[field] = body[field].trim();
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({
      status: 'error',
      message: `Indicá al menos un campo a actualizar: ${UPDATABLE_FIELDS.join(', ')}`,
    });
  }
  if (update.role && !ROLES.includes(update.role)) {
    return res.status(400).json({ status: 'error', message: 'El rol debe ser "user" o "admin"' });
  }

  const user = await UserModel.findByIdAndUpdate(uid, update, { returnDocument: 'after', runValidators: true });
  if (!user) return notFound(res);

  return res.status(200).json({ status: 'success', message: 'Usuario actualizado', payload: user });
};

// DELETE /api/users/:uid
export const deleteUser = async (req, res) => {
  const { uid } = req.params;
  if (!mongoose.isValidObjectId(uid)) return invalidId(res);

  const user = await UserModel.findByIdAndDelete(uid);
  if (!user) return notFound(res);

  return res.status(200).json({ status: 'success', message: 'Usuario eliminado' });
};
