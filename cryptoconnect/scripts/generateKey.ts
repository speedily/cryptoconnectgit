import { privateKeyToAccount } from 'viem/accounts';
import { config } from 'dotenv';
import { randomBytes } from 'crypto';
import { join } from 'path';

// Load environment variables from cryptoconnect/.env
const envPath = join(process.cwd(), '.env');
config({ path: envPath });
console.log(`Reading .env file from: ${envPath}`);

// Get wallet key from .env
const walletKey = process.env.WALLET_KEY;
if (!walletKey) {
  console.error('❌ WALLET_KEY not found in .env file');
  process.exit(1);
}

// Validate and format private key
let formattedKey: `0x${string}`;
try {
  // Remove any whitespace and ensure 0x prefix
  const cleanKey = walletKey.trim().replace(/^0x/, '');
  
  // Validate key length (should be 64 hex characters)
  if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    throw new Error('Invalid private key length');
  }
  
  formattedKey = `0x${cleanKey}`;
} catch (error) {
  console.error('❌ Invalid private key format. Expected 64 hex characters.');
  process.exit(1);
}

// Generate encryption key
const encryptionKey = randomBytes(32).toString('hex');

// Get account from wallet key
const account = privateKeyToAccount(formattedKey);

console.log('\nWallet Details:');
console.log('-------------------');
console.log(`Address: ${account.address}`);
console.log(`Wallet Key: ${formattedKey}`);
console.log('\nAdd this to your .env file:');
console.log(`XMTP_ENCRYPTION_KEY=${encryptionKey}`); 