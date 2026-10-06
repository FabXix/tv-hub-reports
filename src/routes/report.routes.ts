import { Router } from 'express';
import { createReport, deleteReport, listReports, updateReport } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/authenticate.middleware.js';
import { upload } from '../middleware/upload.js';

export const reportRouter = Router();

reportRouter.get('/', authenticate, listReports);
// TODO v4.5 1:
// Completa el método de Multer utilizado para recibir una sola evidencia.
// Objetivo: procesar la imagen antes de ejecutar createReport.
// Resultado esperado: el Controller podrá acceder al archivo mediante request.file.
reportRouter.post(
  '/',
  authenticate,
  // TODO v4.5 1 (respuesta): upload.single('evidence')
  // Punto 3 (múltiples evidencias): se cambia a upload.array('evidence', 5)
  upload.array('evidence', 5),
  createReport
);

// Punto 4: modificar un Report (solo reason, description y status)
reportRouter.patch('/:id', authenticate, updateReport);

// Punto 5: eliminar un Report
reportRouter.delete('/:id', authenticate, deleteReport);
