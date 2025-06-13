import { Client } from "@xmtp/xmtp-js";
import { createSigner } from "../helpers/client";
import { validateEnvironment } from "../helpers/client";
import { DeFiService } from "./services/defi/defiService";
import { SocialService } from "./services/social/socialService";
import { AnalyticsService } from "./analytics/analyticsService";

// Initialize services
const defiService = new DeFiService();
const socialService = new SocialService();
const analyticsService = new AnalyticsService();

// Validate environment variables
const { XMTP_WALLET_KEY, XMTP_ENCRYPTION_KEY } = validateEnvironment([
  "XMTP_WALLET_KEY",
  "XMTP_ENCRYPTION_KEY",
]);

let client: Client | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!client) {
      // Create signer from wallet key
      const walletSigner = createSigner(XMTP_WALLET_KEY);
      const { identifier: walletAddress } = await walletSigner.getIdentity();
      
      // Create signer with proper identity type
      const signer = {
        type: "EOA",
        getIdentity: async () => ({
          kind: "ETHEREUM",
          identifier: walletAddress
        }),
        getIdentifier: async () => ({
          identifierKind: "ETHEREUM",
          identifier: walletAddress
        }),
        signMessage: async (message: Uint8Array) => {
          const signature = await walletSigner.signMessage(message);
          return signature;
        },
        getChainId: () => BigInt(8453), // Base mainnet chain ID
      };

      // Get encryption key - ensure it's exactly 32 bytes
      const encryptionKey = new Uint8Array(Buffer.from(XMTP_ENCRYPTION_KEY, 'hex'));
      if (encryptionKey.length !== 32) {
        throw new Error('Encryption key must be exactly 32 bytes');
      }
      
      // Create XMTP client
      client = await Client.create(signer, {
        env: 'production',
        dbEncryptionKey: encryptionKey,
      });

      // Initialize services
      await defiService.initialize?.();
      await socialService.initialize();
      
      console.log('XMTP client created successfully');
      console.log('Your inbox ID:', client.inboxId);
    }

    // Handle incoming messages
    if (req.method === 'POST') {
      const { message } = req.body;
      if (message) {
        // Process message and generate response
        const response = await processMessage(message);
        return res.status(200).json({ response });
      }
    }

    return res.status(200).json({ status: 'Agent is running' });
  } catch (error) {
    console.error('Error in handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function processMessage(message: string): Promise<string> {
  // Add your message processing logic here
  return `Received: ${message}`;
} 