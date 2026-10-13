// Shared Redis connection helper (Vercel marketplace Redis).
// Vercel injects the connection URL as `storage_REDIS_URL`.

import { createClient } from 'redis';

const REDIS_URL =
  process.env.storage_REDIS_URL ||
  process.env.KV_URL ||
  process.env.REDIS_URL ||
  '';

let client = null;
let connecting = null;

export async function getRedis() {
  if (!REDIS_URL) {
    throw new Error('Redis URL env var is missing (storage_REDIS_URL).');
  }
  if (client && client.isOpen) return client;
  if (connecting) return connecting;

  client = createClient({
    url: REDIS_URL,
    socket: {
      tls: REDIS_URL.startsWith('rediss://'),
      reconnectStrategy: 1000
    }
  });
  client.on('error', function (err) {
    console.error('[redis] error:', err && err.message);
  });
  connecting = client.connect().then(function () {
    connecting = null;
    return client;
  }).catch(function (err) {
    connecting = null;
    client = null;
    throw err;
  });
  return connecting;
}
