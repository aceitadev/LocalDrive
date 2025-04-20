import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import projectRoutes from './routes/project.js';
import './websocket.js';

const app = express();
app.use(cors());
app.use(express.json());

const PROJECTS_BASE = path.join(process.cwd(), 'projects');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(PROJECTS_BASE, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use('/project', projectRoutes);

app.listen(3000, () => {
    console.log('Server running on port 3000');
});