import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { healthPayload } from './http/health.js';
import { createLogger } from './observability/logger.js';
import { RoomManager } from './rooms/RoomManager.js';
import { loadServerConfig } from './config.js';
import { WebSocketServer } from './network/SocketServer.js';

export function createGameServer({ config: configInput, logger: loggerInput } = {}) {
  const config = { ...loadServerConfig(), ...(configInput || {}) };
  const logger = loggerInput || createLogger(config);
  const startedAt = Date.now();
  const roomManager = new RoomManager({
    maxPlayersPerRoom: config.maxPlayersPerRoom,
    roomIdleTtlSeconds: config.roomIdleTtlSeconds,
    logger,
  });
  const registry = { sessionsBySocketId: new Map() };
  const httpServer = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify(healthPayload({ roomManager, registry, startedAt })));
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Not found' }));
  });
  const socketServer = new WebSocketServer(httpServer, { config, roomManager, logger });
  registry.sessionsBySocketId = socketServer.registry.sessionsBySocketId;
  // Keep the room manager cleanup independent from socket traffic.
  const cleanupTimer = setInterval(() => roomManager.cleanup(), 1000);
  cleanupTimer.unref?.();
  return { httpServer, socketServer, roomManager, registry: socketServer.registry, cleanupTimer };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = loadServerConfig();
  const logger = createLogger(config);
  const app = createGameServer({ config, logger });
  app.httpServer.listen(config.port, '0.0.0.0', () => {
    logger.info({ port: config.port, origin: config.gameOrigin }, 'server start');
  });
}
