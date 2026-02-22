#!/usr/bin/env node

import { Daemon } from '../src/index.mjs';
import { startServer, setDaemon } from '../src/server.mjs';
import { loadConfig } from '../src/config.mjs';
import { log } from '../src/logger.mjs';

const config = loadConfig();

// Create daemon
const daemon = new Daemon();
setDaemon(daemon);

// Start HTTP server
const server = startServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('info', 'Received SIGINT, shutting down...');
  daemon.stop();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down...');
  daemon.stop();
  server.close();
  process.exit(0);
});

log('info', `AutoClaude v1.0.0 started. Dashboard at http://${config.server.host}:${config.server.port}`);
