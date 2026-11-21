import dotenv from 'dotenv';
import { resolve } from 'node:path';

// Load environment values from the repository root when commands run in /backend.
dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config();

export function getPort(): number {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}
