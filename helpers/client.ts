// @ts-nocheck
import { getRandomValues } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'url';
import { Client } from "@xmtp/xmtp-js";
import { Signer } from "@xmtp/xmtp-js";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { WalletClient, Account } from "viem/accounts";
import { base } from "viem/chains";

interface User {
  key: `0x${string}`;
  account: Account;
  wallet: WalletClient;
}

export const createUser = (key: string): User => {
  const sanitizedKey = key.startsWith("0x") ? key : `0x${key}`;
  const account = privateKeyToAccount(sanitizedKey as `0x${string}`);
  return {
    key: sanitizedKey as `0x${string}`,
    account,
    wallet: createWalletClient({
      account,
      chain: base,
      transport: http(),
    }),
  };
};

export async function createXmtpClient(signer: Signer): Promise<Client> {
  const client = await Client.create(signer, {
    env: 'production',
  });
  return client;
}

export function createSigner(key: string): Signer {
  const account = privateKeyToAccount(key as `0x${string}`);
  
  const wallet = createWalletClient({
    account,
    chain: base,
    transport: http(),
  });

  return {
    type: "EOA",
    getIdentity: async () => ({
      kind: "ETHEREUM",
      identifier: account.address.toLowerCase(),
    }),
    signMessage: async (message: Uint8Array) => {
      const signature = await wallet.signMessage({
        message: Buffer.from(message).toString('utf-8'),
        account,
      });
      return Buffer.from(signature.slice(2), 'hex');
    },
    getChainId: () => BigInt(8453), // Base mainnet chain ID
  };
}

/**
 * Generate a random encryption key
 * @returns The encryption key
 */
export const generateEncryptionKeyHex = (): string => {
  /* Generate a random encryption key */
  const uint8Array = getRandomValues(new Uint8Array(32));
  /* Convert the encryption key to a hex string */
  return Buffer.from(uint8Array).toString('hex');
};

/**
 * Get the encryption key from a hex string
 * @param hex - The hex string
 * @returns The encryption key
 */
export const getEncryptionKeyFromHex = (hex: string): Uint8Array => {
  /* Convert the hex string to an encryption key */
  return Buffer.from(hex, 'hex');
};

export const getDbPath = (description: string = "xmtp"): string => {
  //Checks if the environment is a Railway deployment
  const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH ?? ".data/xmtp";
  // Create database directory if it doesn't exist
  if (!fs.existsSync(volumePath)) {
    fs.mkdirSync(volumePath, { recursive: true });
  }
  return `${volumePath}/${description}.db3`;
};

export const logAgentDetails = async (
  clients: Client | Client[],
): Promise<void> => {
  const clientArray = Array.isArray(clients) ? clients : [clients];
  const clientsByAddress = clientArray.reduce<Record<string, Client[]>>(
    (acc, client) => {
      const address = client.accountIdentifier?.identifier as string;
      acc[address] = acc[address] ?? [];
      acc[address].push(client);
      return acc;
    },
    {},
  );

  for (const [address, clientGroup] of Object.entries(clientsByAddress)) {
    const firstClient = clientGroup[0];
    const inboxId = firstClient.inboxId;
    const environments = clientGroup
      .map((c: Client) => c.options?.env ?? "dev")
      .join(", ");
    console.log(`\x1b[38;2;252;76;52m
        ██╗  ██╗███╗   ███╗████████╗██████╗ 
        ╚██╗██╔╝████╗ ████║╚══██╔══╝██╔══██╗
         ╚███╔╝ ██╔████╔██║   ██║   ██████╔╝
         ██╔██╗ ██║╚██╔╝██║   ██║   ██╔═══╝ 
        ██╔╝ ██╗██║ ╚═╝ ██║   ██║   ██║     
        ╚═╝  ╚═╝╚═╝     ╚═╝   ╚═╝   ╚═╝     
      \x1b[0m`);

    const urls = [`http://xmtp.chat/dm/${address}`];

    const conversations = await firstClient.conversations.list();
    const installations = await firstClient.preferences.inboxState();

    console.log(`
    ✓ XMTP Client:
    • Address: ${address}
    • Installations: ${installations.installations.length}
    • Conversations: ${conversations.length}
    • InboxId: ${inboxId}
    • Networks: ${environments}
    ${urls.map((url) => `• URL: ${url}`).join("\n")}`);
  }
};

export function validateEnvironment(vars: string[]): Record<string, string> {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    const envPath = path.resolve(process.cwd(), 'cryptoconnect', '.env');
    if (fs.existsSync(envPath)) {
      const envVars = fs
        .readFileSync(envPath, "utf-8")
        .split("\n")
        .reduce<Record<string, string>>((acc, line) => {
          const [key, value] = line.split("=");
          if (key && value) {
            acc[key.trim()] = value.trim();
          }
          return acc;
        }, {});

      // Load missing vars from .env file
      for (const v of missing) {
        if (envVars[v]) process.env[v] = envVars[v];
      }
    }

    const stillMissing = vars.filter((v) => !process.env[v]);
    if (stillMissing.length > 0) {
      console.error("Missing env vars:", stillMissing.join(", "));
      throw new Error(`Missing required environment variables: ${stillMissing.join(", ")}`);
    }
  }

  return vars.reduce<Record<string, string>>((acc, key) => {
    acc[key] = process.env[key] as string;
    return acc;
  }, {});
}

export const getPublicKey = (walletKey: string): string => {
  const account = privateKeyToAccount(walletKey as `0x${string}`);
  return account.address;
};
