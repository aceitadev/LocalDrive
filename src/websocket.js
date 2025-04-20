import { WebSocketServer } from 'ws';
import { clients } from './controllers/projectController.js';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws, req) => {
    const name = new URL(req.url, `http://${req.headers.host}`)
        .searchParams.get('project');
    const proc = clients[name];

    if (!proc) {
        ws.send(`[Erro] Processo '${name}' não está em execução.`);
        ws.close();
        return;
    }

    // Funções para lidar com dados
    const onStdout = (data) => ws.send(data.toString());
    const onStderr = (data) => ws.send(data.toString());

    proc.process.stdout.on('data', onStdout);
    proc.process.stderr.on('data', onStderr);

    // Remover listeners quando o WebSocket é fechado
    ws.on('close', () => {
        proc.process.stdout.off('data', onStdout);
        proc.process.stderr.off('data', onStderr);
    });

    ws.on('message', (msg) => proc.process.stdin.write(msg));
});
