import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { spawn } from 'child_process';

const PROJECTS_BASE = path.join(process.cwd(), 'projects');
export const clients = {};

export const list = (req, res) => {
    try {
        const projects = [];
        const projectDirs = fs.readdirSync(PROJECTS_BASE, { withFileTypes: true });

        for (const dir of projectDirs) {
            if (dir.isDirectory()) {
                const projectDir = path.join(PROJECTS_BASE, dir.name);
                const infoPath = path.join(projectDir, 'infos.json');

                if (fs.existsSync(infoPath)) {
                    const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
                    projects.push({ name: info.name, description: info.description });
                }
            }
        }

        return res.json({ success: true, projects });
    } catch (err) {
        console.error('Erro ao listar projetos:', err);
        return res.status(500).json({ error: 'Falha ao listar projetos' });
    }
};

export const create = (req, res) => {
    const { name, description, startCommand } = req.body;
    const projectDir = path.join(PROJECTS_BASE, name);
    const sourceDir = path.join(projectDir, 'source');

    try {
        fs.mkdirSync(sourceDir, { recursive: true });
        fs.writeFileSync(
            path.join(projectDir, 'infos.json'),
            JSON.stringify({ name, description, startCommand }, null, 2)
        );
        return res.json({ success: true });
    } catch (err) {
        console.error('Erro ao criar projeto:', err);
        return res.status(500).json({ error: 'Falha ao criar projeto' });
    }
};

export const deleteProject = (req, res) => {
    const name = req.params.name;
    const projectDir = path.join(PROJECTS_BASE, name);

    try {
        if (!fs.existsSync(projectDir)) {
            return res.status(404).json({ error: 'Projeto não encontrado' });
        }

        if (clients[name]) {
            clients[name].process.kill();
            delete clients[name];
        }

        fs.rmSync(projectDir, { recursive: true, force: true });

        return res.json({ success: true, message: 'Projeto deletado com sucesso' });
    } catch (err) {
        console.error(`Erro ao deletar projeto '${name}':`, err);
        return res.status(500).json({ error: 'Falha ao deletar projeto' });
    }
};


export const upload = (req, res) => {
    const name = req.params.name;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'Arquivo não enviado' });

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.zip') {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Apenas arquivos .zip são permitidos' });
    }

    const projectDir = path.join(PROJECTS_BASE, name);
    const sourceDir = path.join(projectDir, 'source');
    fs.mkdirSync(sourceDir, { recursive: true });

    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
        const filePath = path.join(sourceDir, file);
        if (fs.lstatSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
        } else {
            fs.rmSync(filePath, { recursive: true, force: true });
        }
    }

    try {
        const zip = new AdmZip(file.path);
        zip.extractAllTo(sourceDir, true);
    } catch (error) {
        console.error('Erro ao extrair zip:', error);
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Arquivo ZIP inválido' });
    }

    fs.unlinkSync(file.path);
    return res.json({ success: true });
};

export const start = (req, res) => {
    const name = req.params.name;
    const projectDir = path.join(PROJECTS_BASE, name);
    const sourceDir = path.join(projectDir, 'source');

    try {
        const info = JSON.parse(
            fs.readFileSync(path.join(projectDir, 'infos.json'))
        );

        const proc = spawn(info.startCommand, { cwd: sourceDir, shell: true });

        proc.stdout.on('data', (data) => {
            // optionally capture output
        });

        proc.stderr.on('data', (data) => {
            // optionally capture errors
        });

        proc.on('close', (code) => {
            delete clients[name];
        });

        clients[name] = { pid: proc.pid, startTime: Date.now(), process: proc };
        return res.json({ success: true, pid: proc.pid });
    } catch (err) {
        console.error(`Erro ao iniciar projeto '${name}':`, err);
        return res.status(500).json({ error: 'Falha ao iniciar projeto' });
    }
};

export const stop = (req, res) => {
    const name = req.params.name;
    const client = clients[name];

    if (!client) {
        return res.status(400).json({ error: 'Projeto não está em execução' });
    }

    client.process.kill();
    delete clients[name];
    return res.json({ success: true });
};

export const status = (req, res) => {
    const name = req.params.name;
    const proc = clients[name];

    if (!proc) {
        return res.json({ status: 'offline' });
    }

    const uptimeSeconds = Math.floor((Date.now() - proc.startTime) / 1000);
    return res.json({
        status: 'online',
        pid: proc.pid,
        uptime: `${Math.floor(uptimeSeconds / 60)}m ${uptimeSeconds % 60}s`
    });
};
