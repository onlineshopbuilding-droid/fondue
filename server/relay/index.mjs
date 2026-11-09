// Plan B relay: forwards JSON text between one host and one guest per room. No game logic.
// Start with: node server/relay/index.mjs [port]
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const port = Number(process.argv[2] ?? 8787);

/** @type {Map<string, {host: any, guest: any}>} */
const rooms = new Map();

const http = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('Fondue relay is running.\n');
});

const sys = (ws, name) => { if (ws?.readyState === 1) ws.send(JSON.stringify({ sys: name })); };

const wss = new WebSocketServer({ server: http });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '/', 'http://relay');
  const code = url.searchParams.get('room');
  const role = url.searchParams.get('role');
  if (!code || (role !== 'host' && role !== 'guest')) { ws.close(); return; }

  if (role === 'host') {
    rooms.get(code)?.host?.close();
    rooms.set(code, { host: ws, guest: null });
    ws.on('message', (data) => {
      const room = rooms.get(code);
      if (room?.host === ws && room.guest?.readyState === 1) room.guest.send(data.toString());
    });
    ws.on('close', () => {
      const room = rooms.get(code);
      if (room?.host !== ws) return;
      sys(room.guest, 'host-left');
      room.guest?.close();
      rooms.delete(code);
    });
    return;
  }

  const room = rooms.get(code);
  if (!room) { sys(ws, 'no-host'); ws.close(); return; }
  room.guest?.close();
  room.guest = ws;
  sys(room.host, 'guest');
  sys(ws, 'ready');
  ws.on('message', (data) => {
    if (room.guest === ws && room.host?.readyState === 1) room.host.send(data.toString());
  });
  ws.on('close', () => {
    if (room.guest !== ws) return;
    room.guest = null;
    sys(room.host, 'guest-left');
  });
});

http.listen(port, () => console.log(`Fondue relay listening on port ${port}`));
