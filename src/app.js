import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import projectRoutes from './routes/project.js';
import { WebSocketServer } from 'ws';

const clients = {};

const app = express();
app.use(cors());
app.use(express.json());

const PROJECTS_BASE = path.join(process.cwd(), 'projects');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(PROJECTS_BASE, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use('/project', projectRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'API de gerenciamento de projetos em execução.'
    })
});

const server = app.listen(3000, '::', () => {
    console.log('Server running on http://localhost:3000');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    const name = new URL(req.url, `http://${req.headers.host}`).searchParams.get('project');
    const proc = clients[name];

    if (!proc) {
        ws.send(`[Erro] Processo '${name}' não está em execução.`);
        ws.close();
        return;
    }

    const onStdout = (data) => ws.send(data.toString());
    const onStderr = (data) => ws.send(data.toString());

    proc.process.stdout.on('data', onStdout);
    proc.process.stderr.on('data', onStderr);

    ws.on('close', () => {
        proc.process.stdout.off('data', onStdout);
        proc.process.stderr.off('data', onStderr);
    });

    ws.on('message', (msg) => proc.process.stdin.write(msg));
});
