import { WebSocketServer } from 'ws';
import { clients } from './controllers/projectController.js';

// Mudando a porta para 8080 (caso queira que seja a mesma do WebSocket no cliente)
const wss = new WebSocketServer({ port: 8080, host: '0.0.0.0' });

wss.on('connection', (ws, req) => {
    const name = new URL(req.url, `http://${req.headers.host}`).searchParams.get('project');

    const proc = clients[name];

    if (!proc) {
        ws.send(`[Erro] Processo '${name}' não está em execução.`);
        ws.close();
        return;
    }

    // Funções para lidar com os dados stdout e stderr do processo
    const onStdout = (data) => ws.send(data.toString());
    const onStderr = (data) => ws.send(data.toString());

    // Inscreve os listeners para stdout e stderr
    proc.process.stdout.on('data', onStdout);
    proc.process.stderr.on('data', onStderr);

    // Remover listeners quando o WebSocket for fechado
    ws.on('close', () => {
        proc.process.stdout.off('data', onStdout);
        proc.process.stderr.off('data', onStderr);
    });

    // Recebe mensagens do WebSocket e escreve no stdin do processo
    ws.on('message', (msg) => proc.process.stdin.write(msg));
});
