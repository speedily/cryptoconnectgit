import path from "node:path";
import { fileURLToPath } from 'url';

export const getStorageDbPath = (env: string, walletAddress: string): string => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, '..');
  const storageDir = path.join(rootDir, 'storage');
  const envDir = path.join(storageDir, env);
  const dbPath = path.join(envDir, `${walletAddress}.db`);
  
  // Ensure directories exist
  require('fs').mkdirSync(storageDir, { recursive: true });
  require('fs').mkdirSync(envDir, { recursive: true });
  
  return dbPath;
}; 