const os = require('os');
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { exec, execSync } = require('child_process');
const https = require('https');

function ensureModule(name) {
    try {
        require.resolve(name);
    } catch (e) {
        console.log(`Module '${name}' not found. Installing...`);
        execSync(`npm install ${name}`, { stdio: 'inherit' });
    }
}
ensureModule('ws');
const { WebSocket, createWebSocketStream } = require('ws');

const NAME = process.env.NAME || os.hostname();

function ask(question) {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function getVariableValue(variableName, defaultValue) {
    const envValue = process.env[variableName];
    if (envValue) return envValue;
    if (defaultValue) return defaultValue;
    let input = '';
    while (!input) {
        input = await ask(`请输入${variableName}: `);
        if (!input) console.log(`${variableName}不能为空，请重新输入!`);
    }
    return input;
}

// 获取公网 IP
function getPublicIP() {
    return new Promise((resolve, reject) => {
        https.get("https://api.ip.sb/ip", (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data.trim()));
        }).on("error", reject);
    });
}

async function main() {
    const UUID = await getVariableValue('UUID', '');
    console.log('你的UUID:', UUID);

    const PORT = await getVariableValue('PORT', '3000');
    console.log('你的端口:', PORT);

    const PUBLIC_IP = await getPublicIP();
    console.log('你的公网IP:', PUBLIC_IP);

    const httpServer = http.createServer((req, res) => {
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Hello, World-WS\n');
        } else if (req.url === `/${UUID}`) {
            const vlessURL = `vless://${UUID}@${PUBLIC_IP}:${PORT}?encryption=none&type=ws&host=${PUBLIC_IP}&path=%2F#Vl-ws-${NAME}`;
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(vlessURL + '\n');
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found\n');
        }
    });

    httpServer.listen(PORT, () => {
        console.log(`HTTP Server is running on port ${PORT}`);
    });

    const wss = new WebSocket.Server({ server: httpServer });
    const uuid = UUID.replace(/-/g, "");
    wss.on('connection', ws => {
        ws.once('message', msg => {
            const [VERSION] = msg;
            const id = msg.slice(1, 17);
            if (!id.every((v, i) => v == parseInt(uuid.substr(i * 2, 2), 16))) return;
            let i = msg.slice(17, 18).readUInt8() + 19;
            const port = msg.slice(i, i += 2).readUInt16BE(0);
            const ATYP = msg.slice(i, i += 1).readUInt8();
            const host = ATYP == 1 ? msg.slice(i, i += 4).join('.') :
                (ATYP == 2 ? new TextDecoder().decode(msg.slice(i + 1, i += 1 + msg.slice(i, i + 1).readUInt8())) :
                    (ATYP == 3 ? msg.slice(i, i += 16).reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), []).map(b => b.readUInt16BE(0).toString(16)).join(':') : ''));
            ws.send(new Uint8Array([VERSION, 0]));
            const duplex = createWebSocketStream(ws);
            net.connect({ host, port }, function () {
                this.write(msg.slice(i));
                duplex.on('error', () => { }).pipe(this).on('error', () => { }).pipe(duplex);
            }).on('error', () => { });
        }).on('error', () => { });
    });

    console.log(`vless-ws节点分享: vless://${UUID}@${PUBLIC_IP}:${PORT}?encryption=none&type=ws&host=${PUBLIC_IP}&path=%2F#Vl-ws-${NAME}`);
}
main();
