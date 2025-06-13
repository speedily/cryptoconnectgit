import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Gets the base directory for XMTP storage
 */
function getBaseDir(): string {
  return join(process.cwd(), '.data');
}

/**
 * Ensures that the local storage directory structure exists.
 * Creates the necessary directories if they don't exist.
 */
export function ensureLocalStorage(): void {
  try {
    const baseDir = getBaseDir();
    const dirs = [
      baseDir,
      join(baseDir, 'xmtp')
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    }
  } catch (error) {
    console.error('Error ensuring local storage directories:', error);
    throw error;
  }
}

/**
 * Gets the path for storing XMTP client data
 * @param env - Environment (e.g., 'dev', 'production')
 * @param address - Wallet address
 * @returns Full path to the database directory
 */
export function getDbPath(env: string, address: string): string {
  const baseDir = join(getBaseDir(), 'xmtp');
  
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true, mode: 0o755 });
    console.log(`Created database directory: ${baseDir}`);
  }
  
  const dbPath = join(baseDir, `${env}-${address.toLowerCase()}.db3`);
  console.log('Database will be created at:', dbPath);
  return dbPath;
}
