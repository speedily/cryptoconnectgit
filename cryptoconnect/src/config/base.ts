import { AgentKit } from "@coinbase/agentkit";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export const baseConfig = {
  network: baseSepolia,
  rpcUrl: process.env.BASE_RPC_URL || "https://sepolia.base.org",
  walletClient: createWalletClient({
    chain: baseSepolia,
    transport: http()
  })
};

export async function createBaseAgentKit(walletProvider: any) {
  return await AgentKit.from({
    walletProvider,
    actionProviders: []
  });
} 