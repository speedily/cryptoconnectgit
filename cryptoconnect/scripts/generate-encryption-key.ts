import { randomBytes } from 'crypto';

// Generate a random 32-byte key
const key = randomBytes(32);

// Convert to hex string
const hexKey = key.toString('hex');

console.log('Generated 32-byte encryption key:');
console.log(hexKey);
console.log('\nAdd this to your .env file as:');
console.log(`XMTP_ENCRYPTION_KEY=${hexKey}`); 