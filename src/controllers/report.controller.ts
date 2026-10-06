import { unlink } from 'node:fs/promises';
import type { RequestHandler } from 'express';
import { isValidObjectId } from 'mongoose';
import { Channel } from '../models/channel.model.js';
import { Report, reportReasons } from '../models/report.model.js';
import { AppError } from '../utils/app-error.js';

function getUserId(request: Parameters<RequestHandler>[0]): string {
  if (!request.auth) throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  return request.auth.userId;
}

function readRequiredText(value: unknown, code: string, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(400, code, message);
  return value.trim();
}

async function removeUploadedEvidence(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(files.map((file) => unlink(file.path).catch(() => undefined)));
}

export const createReport: RequestHandler = async (request, response) => {
  // request.file (single) -> request.files (array) por el punto 3
  const files = (request.files as Express.Multer.File[] | undefined) ?? [];

  try {
    const userId = getUserId(request);
    const channelId = readRequiredText(request.body.channelId, 'INVALID_CHANNEL_ID', 'Channel id is invalid');
    if (!isValidObjectId(channelId)) throw new AppError(400, 'INVALID_CHANNEL_ID', 'Channel id is invalid');

    const reason = readRequiredText(request.body.reason, 'INVALID_REPORT_REASON', 'Report reason is invalid');
    if (!reportReasons.includes(reason as (typeof reportReasons)[number])) {
      throw new AppError(400, 'INVALID_REPORT_REASON', 'Report reason is invalid');
    }

    const description = readRequiredText(request.body.description, 'INVALID_REPORT_DESCRIPTION', 'Description is required');
    if (description.length > 1000) {
      throw new AppError(400, 'INVALID_REPORT_DESCRIPTION', 'Description must be 1000 characters or fewer');
    }

    const channel = await Channel.findOne({ _id: channelId, isActive: true });
    if (!channel) throw new AppError(404, 'CHANNEL_NOT_FOUND', 'Channel was not found');

    // TODO v4.5 2:
    // Completa la propiedad de Multer que contiene el nombre final del archivo.
    // Objetivo: construir la URL que se almacenará dentro del Report.
    // Resultado esperado: evidenceUrl tendrá una ruta como /uploads/reports/archivo.png.
    // Respuesta TODO 2: file.filename (single). Punto 3: una ruta por cada archivo de request.files.
    const evidenceUrls = files.map((file) => `/uploads/reports/${file.filename}`);

    // TODO v4.5 3:
    // Completa el método del Model utilizado para crear un nuevo Report.
    // Objetivo: persistir los datos del reporte y la referencia de la evidencia.
    // Resultado esperado: MongoDB contendrá un nuevo Report con status OPEN.
    const report = await Report.create({
      userId,
      channelId,
      reason,
      description,
      evidenceUrls
    });

    response.status(201).json({ report });
  } catch (error) {
    await removeUploadedEvidence(files);
    throw error;
  }
};

export const listReports: RequestHandler = async (request, response) => {
  // TODO v4.5 6:
  // Completa el método de Mongoose utilizado para consultar los Reports del usuario.
  // Objetivo: recuperar los reportes existentes del usuario autenticado.
  // Resultado esperado: GET /api/reports devolverá los Reports ordenados por fecha.
  const reports = await Report.find({ userId: getUserId(request) })
    .populate('channelId', 'name')
    .sort('-createdAt');

  response.json({ reports });
};

// Punto 4: PATCH /api/reports/:id
export const updateReport: RequestHandler = async (request, response) => {
  const userId = getUserId(request);
  const id = String(request.params.id);
  if (!isValidObjectId(id)) throw new AppError(400, 'INVALID_REPORT_ID', 'Report id is invalid');

  const report = await Report.findOneAndUpdate(
    { _id: id, userId },
    { reason: request.body.reason, description: request.body.description, status: request.body.status },
    { new: true, runValidators: true }
  );
  if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report was not found');

  response.json({ report });
};

// Punto 5: DELETE /api/reports/:id (no borra las imágenes del storage)
export const deleteReport: RequestHandler = async (request, response) => {
  const userId = getUserId(request);
  const id = String(request.params.id);
  if (!isValidObjectId(id)) throw new AppError(400, 'INVALID_REPORT_ID', 'Report id is invalid');

  const report = await Report.findOneAndDelete({ _id: id, userId });
  if (!report) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report was not found');

  response.status(204).end();
};
