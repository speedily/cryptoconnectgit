// @ts-nocheck
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { generateEncryptionKeyHex, getPublicKey } from "../helpers/client";
import { privateKeyToAccount } from "viem/accounts";

// Check Node.js version
const nodeVersion = process.versions.node;
const [major] = nodeVersion.split(".").map(Number);
if (major < 20) {
  console.error("Error: Node.js version 20 or higher is required");
  process.exit(1);
}

async function main() {
  // Read existing .env file from cryptoconnect directory
  const envPath = join(process.cwd(), "cryptoconnect", ".env");
  console.log(`Reading .env file from: ${envPath}`);
  
  let envContent = "";
  try {
    envContent = await readFile(envPath, "utf-8");
  } catch (error) {
    console.error("Error: No .env file found");
    process.exit(1);
  }

  // Parse existing .env file to get XMTP_WALLET_KEY
  const envVars = envContent.split("\n").reduce<Record<string, string>>((acc, line) => {
    const [key, ...val] = line.split("=");
    if (key && val.length) acc[key.trim()] = val.join("=").trim();
    return acc;
  }, {});

  const walletKey = envVars["XMTP_WALLET_KEY"];
  if (!walletKey) {
    console.error("Error: XMTP_WALLET_KEY not found in .env file");
    process.exit(1);
  }

  // Get public key from wallet key
  console.log("\nGenerating public key from your wallet key...");
  const account = privateKeyToAccount(walletKey as `0x${string}`);
  console.log("\n=== XMTP Wallet Key ===");
  console.log(`XMTP_WALLET_KEY=${walletKey}`);
  console.log(`XMTP_PUBLIC_KEY=${account.address} (derived from your wallet key)`);
  console.log("=====================\n");

  // Generate encryption key
  console.log("Generating new encryption key...");
  const encryptionKey = generateEncryptionKeyHex();
  console.log("=== XMTP Encryption Key ===");
  console.log(`XMTP_ENCRYPTION_KEY=${encryptionKey} (newly generated)`);
  console.log("=========================\n");

  console.log("Copy the XMTP_ENCRYPTION_KEY to your .env file manually");
}

main().catch(console.error);
