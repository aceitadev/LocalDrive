import express from 'express';
import multer from 'multer';
import path from 'path';
import * as controller from '../controllers/projectController.js';

const router = express.Router();
const upload = multer({ dest: path.join(process.cwd(), 'uploads') });

router.get('/list', controller.list);
router.post('/create', controller.create);
router.delete('/:name', controller.deleteProject);
router.post('/:name/upload', upload.single('file'), controller.upload);
router.post('/:name/start', controller.start);
router.post('/:name/stop', controller.stop);
router.get('/:name/status', controller.status);

export default router;