import { config } from 'dotenv';
import './crypto-init';
import { initializeXmtpClient, startMessageListener } from './agent-index';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as process from 'process';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = resolve(__dirname, '..', '.env');
config({ path: envPath });
console.log(`Loading environment variables from: ${envPath}`);

async function main() {
    try {
        // Set working directory to the project root
        const projectRoot = resolve(__dirname, '..');
        process.chdir(projectRoot);
        
        console.log('Starting CryptoConnect agent...');
        console.log('Project root:', projectRoot);
        
        // Initialize XMTP client
        const client = await initializeXmtpClient();
        console.log('XMTP client initialized successfully');
        
        // Start listening for messages
        await startMessageListener(client);
        console.log('Message listener started');
        
        console.log('CryptoConnect agent is now running!');
        console.log('Press Ctrl+C to stop the agent');
    } catch (error) {
        console.error('Error starting CryptoConnect agent:', error);
        process.exit(1);
    }
}

main();