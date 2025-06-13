// @ts-nocheck
import {
  AgentKit,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  CdpWalletProvider,
  erc20ActionProvider,
  walletActionProvider,
} from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { 
  Client, 
  type Group, 
  type GroupMember as XmtpGroupMember, 
  type PermissionLevel,
  type DecodedMessage,
  type Conversation,
  type Dm,
  type Signer,
  type StreamCallback,
  IdentifierKind
} from "@xmtp/node-sdk";
import { SocialManager as ISocialManager, type GroupData, type Role, type XmtpGroup, type CreateGroupOptions } from "./social-index";
import { AIService } from "./ai/aiService";
import { AnalyticsService } from "./analytics/analyticsService";
import { createBaseAgentKit } from "./config/base";
//import { SocialManagerImpl } from "./social/socialManager";
import { createWalletClient, http, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { Wallet } from 'ethers';
import dotenv from 'dotenv';
import { SocialManager } from './social-index';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/config';
import { ensureLocalStorage, getDbPath as getStorageDbPath } from '@/utils/storage'; // Removed crypto import as functions are defined below
import { aiService } from "./ai";
import { communityAnalytics } from "./analytics";
import { DeFiService } from "./defi/defiService";
import * as fs from 'fs';
import { randomBytes } from 'node:crypto';

// Override crypto.getRandomValues with Node.js implementation
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (array: Uint8Array) => {
      const bytes = randomBytes(array.length);
      array.set(bytes);
      return array;
    }
  } as any;
}

// Define a union type that can handle all conversation types
type AnyConversation<T = unknown> = Conversation<T> | Group<T> | Dm<T>;

// Type guard for Group conversations
function isGroup<T>(conversation: AnyConversation<T>): conversation is Group<T> {
  return 'isGroup' in conversation && conversation.isGroup === true;
}

// Type guard for Dm conversations
function isDm<T>(conversation: AnyConversation<T>): conversation is Dm<T> {
  return 'peerAddress' in conversation && !isGroup(conversation);
}

// Helper function to convert XMTP group member to our GroupMember type
function toGroupMember(member: XmtpGroupMember, role: Role) {
  return {
    accountAddress: (member as any).accountAddress || (member as any).address,
    role,
    joinedAt: new Date(),
    isMuted: false,
    isBanned: false,
    installationIds: [],
    permissionLevel: 0,
    consentState: 'unknown' as const,
  };
}

// Define manager interfaces
interface DeFiManager {
  getPortfolioData(tokenAddress: string): Promise<any>;
  getMarketData(tokenAddress?: string): Promise<any>;
  executeTrade(
    tokenAddress: string,
    amount: string,
    action: 'buy' | 'sell'
  ): Promise<boolean>;
}

// Define manager interfaces
interface AIManager {
  // Process a message and return a response
  processMessage(message: string): Promise<string>;
  
  // Generate trading insights from portfolio and market data
  generateInsights(portfolioData: any, marketData: any): Promise<any>;
}

// Simple implementations of manager classes
class AIManagerImpl implements AIManager {
  constructor(private service: any) {}
  
  async processMessage(message: string): Promise<string> {
    try {
      // Create a system message to define the agent's role
      const systemMessage = new SystemMessage(
        'You are CryptoConnect, an AI-powered DeFi assistant on Base. ' +
        'You help users discover and engage with DeFi opportunities, provide market insights, ' +
        'and assist with trading decisions. Be concise, informative, and friendly.'
      );

      // Create a human message with the user's input
      const humanMessage = new HumanMessage(message);

      // Get response from the AI service
      const response = await this.service.model.invoke([systemMessage, humanMessage]);
      return response.content as string;
    } catch (error) {
      console.error('Error processing message:', error);
      return 'I apologize, but I encountered an error processing your message. Please try again.';
    }
  }
  
  async generateInsights(portfolioData: any, marketData: any): Promise<any> {
    try {
      // Basic analysis of portfolio and market data
      const insights = {
        timestamp: new Date().toISOString(),
        portfolioSummary: {
          totalValue: portfolioData?.totalValue || 0,
          assetCount: portfolioData?.assets?.length || 0,
          topPerformingAsset: portfolioData?.assets?.reduce((max: any, asset: any) => 
            (asset.performance > (max?.performance || 0) ? asset : max), {})
        },
        marketAnalysis: {
          currentPrice: marketData?.currentPrice || 0,
          priceChange24h: marketData?.priceChange24h || 0,
          marketCap: marketData?.marketCap || 0,
          volume24h: marketData?.volume24h || 0
        },
        recommendations: [
          'Consider rebalancing your portfolio based on current market conditions.',
          'Diversify your holdings to mitigate risk.'
        ]
      };

      return insights;
    } catch (error) {
      console.error('Error generating insights:', error);
      return {
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

class DeFiManagerImpl implements DeFiManager {
  constructor(private service: any) {}
  // Add methods as needed
  async getPortfolioData(tokenAddress: string) { 
    // In a real implementation, this would fetch portfolio data for the given token address
    console.log(`Fetching portfolio data for token: ${tokenAddress}`);
    return { tokenAddress, balance: '100', value: '1000', tokens: [
      { symbol: 'ETH', balance: '1.5', value: '4500' },
      { symbol: 'USDC', balance: '1000', value: '1000' }
    ] }; 
  }
  
  async getMarketData(tokenAddress?: string) { 
    // In a real implementation, this would fetch market data for the given token
    console.log(`Fetching market data for token: ${tokenAddress || 'all'}`);
    if (tokenAddress) {
      return {
        tokenAddress,
        price: '1500',
        change24h: '2.5%',
        volume24h: '1000000',
        marketCap: '1000000000'
      };
    }
    // Return general market data if no token address is provided
    return {
      totalMarketCap: '2000000000000',
      volume24h: '100000000000',
      btcDominance: '45%',
      ethDominance: '20%',
      fearAndGreed: '60'
    };
  }
  async executeTrade(
    tokenAddress: string,
    amount: string,
    action: 'buy' | 'sell'
  ): Promise<boolean> {
    // Trade execution logic here
    console.log(`Executing ${action} trade for ${amount} of token ${tokenAddress}`);
    // In a real implementation, this would execute the trade and return true if successful
    return true;
  }
}

// Extend SocialManager to properly inherit client property
export class SocialManagerImpl extends SocialManager {
  public client: Client;

  private constructor(client: Client) {
    super(client);
    this.client = client;
  }

  public static getInstance(client: Client): SocialManagerImpl {
    return new SocialManagerImpl(client);
  }

  async getGroupData(group: Group<unknown>): Promise<GroupData> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      const groupId = xmtpGroup.topic;
      const members = await xmtpGroup.members();
      const memberData = await Promise.all(
        members.map(async (member) => {
          const isAdmin = await xmtpGroup.isAdmin((member as any).accountAddress || (member as any).address);
          return toGroupMember(member, isAdmin ? 'admin' : 'member');
        })
      );
      const groupData: GroupData = {
        id: groupId,
        name: xmtpGroup.name,
        description: xmtpGroup.description,
        members: memberData,
        createdAt: xmtpGroup.createdAt,
        updatedAt: xmtpGroup.updatedAt,
        isPublic: (xmtpGroup as any).isPublic || false,
        defaultRole: (xmtpGroup as any).defaultRole || 'member',
        permissions: (xmtpGroup as any).permissions || {
          allowMemberInvites: true,
          allowMessageEdits: true,
          allowMessageDeletion: true,
          allowMemberPromotion: true,
          allowMemberRemoval: true,
          allowMemberMuting: true,
          allowMemberBanning: true,
        },
        settings: {
          enableTrading: xmtpGroup.settings?.enableTrading ?? true,
          enableAnalytics: xmtpGroup.settings?.enableAnalytics ?? true,
          enableCompetitions: xmtpGroup.settings?.enableCompetitions ?? true,
        },
      };
      return groupData;
    } catch (error) {
      console.error('Error getting group data:', error);
      throw error;
    }
  }

  async createGroup(
    name: string,
    description: string,
    members: string[],
    options: CreateGroupOptions = {}
  ): Promise<Group<unknown>> {
    try {
      const group = await (this.client as any).conversations.newGroup(members, {
        groupName: name,
        groupDescription: description,
        isPublic: options.isPublic,
        settings: options.settings
      });
      return group as unknown as Group<unknown>;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  async getGroup(groupId: string): Promise<Group<unknown> | null> {
    try {
      const conversation = await this.client.conversations.getConversationById(groupId);
      if (!conversation || !isGroup(conversation)) {
        return null;
      }
      return conversation as unknown as Group<unknown>;
    } catch (error) {
      console.error('Error getting group:', error);
      return null;
    }
  }

  async addMembers(group: Group<unknown>, members: string[]): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.addMembers(members);
    } catch (error) {
      console.error('Error adding members:', error);
      throw error;
    }
  }

  async removeMembers(group: Group<unknown>, members: string[]): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.removeMembers(members);
    } catch (error) {
      console.error('Error removing members:', error);
      throw error;
    }
  }

  async addGroupMember(group: Group<unknown>, member: string): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.addMembers([member]);
    } catch (error) {
      console.error('Error adding group member:', error);
      throw error;
    }
  }

  async removeGroupMember(group: Group<unknown>, member: string): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.removeMembers([member]);
    } catch (error) {
      console.error('Error removing group member:', error);
      throw error;
    }
  }

  async updateMemberRole(groupId: string, member: string, role: Role): Promise<void> {
    try {
      const group = await this.getGroup(groupId);
      if (!group) {
        throw new Error('Group not found');
      }
      // Implement role update logic here
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  async isGroupAdmin(group: Group<unknown>, member: string): Promise<boolean> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      const admins = await xmtpGroup.admins();
      return admins.some((admin: any) => 
        (admin.accountAddress || admin).toLowerCase() === member.toLowerCase()
      );
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  async broadcastMessage(group: Group<unknown>, message: string): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.send(message);
    } catch (error) {
      console.error('Error broadcasting message:', error);
      throw error;
    }
  }

  async sendGroupMessage(group: Group<unknown>, message: string): Promise<void> {
    const xmtpGroup = group as unknown as XmtpGroup;
    try {
      await xmtpGroup.send(message);
    } catch (error) {
      console.error('Error sending group message:', error);
      throw error;
    }
  }
}

// Set Node.js environment variables
process.env.NODE_OPTIONS = '--openssl-legacy-provider';

// Suppress the random number source warning
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0]?.includes('Missing strong random number source')) {
    return;
  }
  originalWarn.apply(console, args);
};

// Storage constants
const XMTP_STORAGE_DIR = ".data/xmtp";
const WALLET_STORAGE_DIR = ".data/wallet";

// Helper function to validate environment variables
function validateEnvironment(requiredVars: string[]): Record<string, string> {
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
  return process.env as Record<string, string>;
}

const {
  XMTP_WALLET_KEY,
  XMTP_ENCRYPTION_KEY,
  XMTP_ENV,
  CDP_API_KEY_NAME,
  CDP_API_KEY_PRIVATE_KEY,
  NETWORK_ID,
} = validateEnvironment([
  "XMTP_WALLET_KEY",
  "XMTP_ENCRYPTION_KEY",
  "XMTP_ENV",
  "CDP_API_KEY_NAME",
  "CDP_API_KEY_PRIVATE_KEY",
  "NETWORK_ID",
]);

// Define a simple social service interface
interface ISocialService {
  initialize(): Promise<void>;
  // Add other methods as needed
}

// Simple implementation of SocialService
class SocialService implements ISocialService {
  async initialize(): Promise<void> {
    console.log('Initializing SocialService');
  }
}

// Define service dependencies interface
interface ServiceDependencies {
  aiService: AIService;
  defiService: DeFiService;
  analyticsService: AnalyticsService;
  socialManager: SocialManagerImpl;
}

// Global services instance
let defaultServices: ServiceDependencies;

// Ensure storage directories exist
function ensureLocalStorage() {
  const dirs = [XMTP_STORAGE_DIR, WALLET_STORAGE_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Global stores for memory and agent instances
const memoryStore: Record<string, MemorySaver> = {};
const agentStore: Record<string, Agent> = {};

interface AgentConfig {
  configurable: {
    thread_id: string;
  };
}

type Agent = ReturnType<typeof createReactAgent>;

// Type guard for streamMessages
function hasStreamMessages(obj: any): obj is { streamMessages: () => AsyncIterable<any> } {
  return typeof obj.streamMessages === 'function';
}

/**
 * Create a signer for XMTP
 */
function createSigner(key: string): Signer {
  // Ensure private key is in correct format (with 0x prefix)
  const formattedKey = key.startsWith('0x') ? key : `0x${key}`;
  
  // Create account from private key
  const account = privateKeyToAccount(formattedKey as `0x${string}`);
  
  const wallet = createWalletClient({
    account,
    chain: base,
    transport: http(),
  });

  // Create a signer object that matches the Signer interface
  const signer: Signer = {
    type: "EOA",
    getIdentity: async () => ({
      kind: "ETHEREUM",
      identifier: account.address.toLowerCase(),
    }),
    getIdentifier: async () => ({
      identifierKind: IdentifierKind.Ethereum,
      identifier: account.address.toLowerCase(),
    }),
    signMessage: async (message: Uint8Array) => {
      const signature = await wallet.signMessage({
        message: Buffer.from(message).toString('utf-8'),
        account,
      });
      return toBytes(signature);
    },
    getChainId: () => BigInt(8453), // Base mainnet chain ID
  };
  
  return signer;
}

/**
 * Get encryption key from hex string
 */
function getEncryptionKeyFromHex(hex: string): Uint8Array {
  // Remove '0x' prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  
  // Ensure the hex string is exactly 64 characters (32 bytes)
  if (cleanHex.length !== 64) {
    throw new Error('Encryption key must be exactly 32 bytes (64 hex characters)');
  }
  
  // Convert to Uint8Array
  const key = Buffer.from(cleanHex, 'hex');
  
  // Verify length
  if (key.length !== 32) {
    throw new Error('Encryption key must be exactly 32 bytes');
  }
  
  return key;
}

/**
 * Initialize the XMTP client
 */
export async function initializeXmtpClient(): Promise<Client> {
  try {
    ensureLocalStorage();
    
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
        identifierKind: IdentifierKind.Ethereum,
        identifier: walletAddress
      }),
      signMessage: async (message: Uint8Array) => {
        const signature = await walletSigner.signMessage(message);
        return signature;
      },
      getChainId: () => BigInt(8453), // Base mainnet chain ID
    };
    
    // Get encryption key with better error handling
    let encryptionKey: Uint8Array;
    try {
      if (!XMTP_ENCRYPTION_KEY) {
        throw new Error('XMTP_ENCRYPTION_KEY is not set in environment variables');
      }
      console.log('Raw encryption key:', XMTP_ENCRYPTION_KEY);
      console.log('Encryption key length:', XMTP_ENCRYPTION_KEY.length);
      encryptionKey = getEncryptionKeyFromHex(XMTP_ENCRYPTION_KEY);
      console.log('Encryption key length:', encryptionKey.length, 'bytes');
      console.log('Encryption key (hex):', Buffer.from(encryptionKey).toString('hex'));
    } catch (error) {
      console.error('Error creating encryption key:', error);
      throw error;
    }
    
    // Get database path using the storage utility
    const dbPath = getStorageDbPath('dev', walletAddress);
    console.log('Database path:', dbPath);
    console.log('Current working directory:', process.cwd());
    console.log('Directory exists:', require('fs').existsSync(path.dirname(dbPath)));
    console.log('Directory permissions:', require('fs').statSync(path.dirname(dbPath)).mode.toString(8));
    console.log('Parent directory permissions:', require('fs').statSync(path.dirname(path.dirname(dbPath))).mode.toString(8));
    
    // Create XMTP client with proper typing
    console.log('Creating XMTP client with options:', {
      env: 'production',
      dbPath,
      encryptionKeyLength: encryptionKey.length,
      walletAddress
    });
    
    const client = await Client.create(signer, {
      env: 'production', // Use production environment for Base mainnet
      dbEncryptionKey: encryptionKey,
      dbPath: dbPath
    });
    
    console.log('XMTP client created successfully');
    console.log('Your inbox ID:', client.inboxId);
    
    // Initialize services with proper error handling
    try {
      // Initialize services in sequence to handle dependencies
      await defiService.initialize?.();
      await socialService.initialize();
      console.log('All services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw error;
    }
    
    return client;
  } catch (error) {
    console.error("Error initializing XMTP client or services:", error);
    throw error;
  }
}

// Initialize singleton services
const defiService = DeFiService.getInstance();
const socialService = new SocialService();

export async function startMessageListener(client: Client) {
  try {
    // Services are already initialized in the main function
    console.log('Starting message listener...');

    // Initialize services with the client
    const services: ServiceDependencies = {
      aiService,
      defiService,
      analyticsService: new AnalyticsService(client),
      socialManager: SocialManagerImpl.getInstance(client)
    };

    // Subscribe to existing conversations
    const conversations = await client.conversations.list();
    for (const conversation of conversations) {
      await handleConversation(conversation, services, client);
    }

    // Stream new conversations
    for await (const conversation of client.conversations.stream()) {
      if (conversation) {
        await handleConversation(conversation, services, client);
      }
    }
  } catch (error) {
    console.error('Error in message listener:', error);
    throw error;
  }
}

async function handleConversation<T = unknown>(
  conversation: AnyConversation<T>,
  services: ServiceDependencies,
  client: Client
): Promise<void> {
  const { aiService, defiService, socialManager } = services;
  
  try {
    // Process the conversation
    const peerAddress = isDm(conversation) ? conversation.peerInboxId : 'group';
    console.log(`Processing conversation with ${peerAddress}`);
    
    // Add your conversation handling logic here
    const messages = await conversation.messages();
    for (const message of messages) {
      console.log(`Message from ${message.senderInboxId}: ${message.content}`);
    }
    
    // Handle message streaming if available
    if (hasStreamMessages(conversation)) {
      try {
        for await (const message of conversation.streamMessages()) {
          // Skip messages from self
          if (message.senderInboxId === ('peerAddress' in conversation ? conversation.peerAddress : '')) {
            continue;
          }

          console.log(`New message from ${message.senderInboxId}:`, message.content);

          // Create managers with proper typing
          const managers = {
            aiManager: new AIManagerImpl(aiService),
            defiManager: new DeFiManagerImpl(defiService),
            socialManager: SocialManagerImpl.getInstance(client)
          };

          // Process message based on conversation type
          if (isGroup(conversation)) {
            await handleGroupMessage(message, conversation, managers);
          } else {
            if (isDm(conversation)) {
              await handleDirectMessage(message, conversation, managers);
            }
          }
        }
      } catch (error) {
        console.error('Error in message stream:', error);
      }
    }
  } catch (error) {
    console.error(`Error handling conversation:`, error);
  }
}

async function handleGroupMessage<T = any>(
  message: DecodedMessage,
  conversation: Group<T>,
  managers: {
    aiManager: AIManagerImpl;
    defiManager: DeFiManagerImpl;
    socialManager: SocialManagerImpl;
  }
) {
  const { aiManager, defiManager, socialManager } = managers;

  try {
    // Process group commands
    const content = message.content as string;
    if (content.startsWith('/')) {
      const [command, ...args] = content.slice(1).split(' ');
      switch (command.toLowerCase()) {
        case 'analysis': {
          const tokenAddress = args[0];
          if (!tokenAddress) {
            await conversation.send('Please provide a token address for analysis.' as unknown as T);
            return;
          }
          const portfolioData = await defiManager.getPortfolioData(tokenAddress);
          const marketData = await defiManager.getMarketData(tokenAddress);
          const insight = await aiManager.generateInsights(portfolioData, marketData);
          await conversation.send(`Trading Analysis:\n${JSON.stringify(insight, null, 2)}` as unknown as T);
          break;
        }
        case 'trade': {
          const [tokenAddress, amount, action] = args;
          if (!tokenAddress || !amount || !action) {
            await conversation.send('Usage: /trade <tokenAddress> <amount> <buy|sell>' as unknown as T);
            return;
          }
          if (action !== 'buy' && action !== 'sell') {
            await conversation.send('Invalid action. Use "buy" or "sell".' as unknown as T);
            return;
          }
          await defiManager.executeTrade(tokenAddress, amount, action);
          await conversation.send(`${action.toUpperCase()} order executed successfully!` as unknown as T);
          break;
        }
        default:
          await conversation.send('Available commands:\n/analysis <tokenAddress>\n/trade <tokenAddress> <amount> <buy|sell>' as unknown as T);
      }
    }
  } catch (error) {
    console.error('Error handling group message:', error);
    await conversation.send('An error occurred while processing your request.' as unknown as T);
  }
}

async function handleDirectMessage<T = any>(
  message: DecodedMessage,
  conversation: Dm<T>,
  managers: {
    aiManager: AIManagerImpl;
    defiManager: DeFiManagerImpl;
    socialManager: SocialManagerImpl;
  }
) {
  console.log('Received direct message:', {
    from: message.senderInboxId,
    content: message.content,
    timestamp: message.sent
  });

  const { aiManager, defiManager, socialManager } = managers;

  try {
    // Process direct message commands
    const content = message.content as string;
    
    // Handle regular messages (non-commands)
    if (!content.startsWith('/')) {
      console.log('Processing regular message:', content);
      const response = await aiManager.processMessage(content);
      await conversation.send(response as unknown as T);
      return;
    }

    // Handle commands
    const [command, ...args] = content.slice(1).split(' ');
    switch (command.toLowerCase()) {
      case 'create_group': {
        const [name, description, ...members] = args;
        if (!name || !description || members.length === 0) {
          await conversation.send('Usage: /create_group <name> <description> <member1> [member2...]' as unknown as T);
          return;
        }
        const group = await socialManager.createGroup(name, description, members);
        await conversation.send(`Group "${name}" created successfully!` as unknown as T);
        break;
      }
      case 'portfolio': {
        const tokenAddress = args[0];
        if (!tokenAddress) {
          await conversation.send('Please provide a token address.' as unknown as T);
          return;
        }
        const portfolioData = await defiManager.getPortfolioData(tokenAddress);
        await conversation.send(`Portfolio Data:\n${JSON.stringify(portfolioData, null, 2)}` as unknown as T);
        break;
      }
      default:
        await conversation.send('Available commands:\n/create_group <name> <description> <member1> [member2...]\n/portfolio <tokenAddress>' as unknown as T);
    }
  } catch (error) {
    console.error('Error handling direct message:', error);
    await conversation.send('An error occurred while processing your request.' as unknown as T);
  }
}

/**
 * Process a message with the agent
 */
async function processMessage(
  agent: Agent,
  config: AgentConfig,
  message: string,
): Promise<string> {
  let response = "";

  try {
    const stream = await agent.stream(
      { messages: [new HumanMessage(message)] },
      config,
    );

    for await (const chunk of stream) {
      if (chunk && typeof chunk === "object" && "agent" in chunk) {
        const agentChunk = chunk as {
          agent: { messages: Array<{ content: unknown }> };
        };
        response += String(agentChunk.agent.messages[0].content) + "\n";
      }
    }

    return response;
  } catch (error) {
    console.error("Error processing message:", error);
    return "Sorry, I encountered an error processing your request.";
  }
}

/**
 * Handle incoming messages
 */
async function handleMessage(message: DecodedMessage, client: Client) {
  const conversation = await client.conversations.getConversationById(message.conversationId);
  if (!conversation) {
    console.error('Conversation not found');
    return;
  }
  
  // Track analytics
  if (isGroup(conversation)) {
    const analyticsService = new AnalyticsService(client);
    const groupConversation = conversation as unknown as Group<unknown>;
    await analyticsService.trackPerformance(groupConversation);
    await analyticsService.trackUserMetrics(groupConversation);
    await analyticsService.trackTradingMetrics(groupConversation);
  }

  // Process message with AI
  const aiManager = new AIManagerImpl(aiService);
  const aiResponse = await aiManager.processMessage(message.content as string);
  
  // Handle conversation based on type
  if (isGroup(conversation)) {
    const managers = {
      aiManager: new AIManagerImpl(aiService),
      defiManager: new DeFiManagerImpl(defiService),
      socialManager: SocialManagerImpl.getInstance(client)
    };
    await handleGroupMessage(message, conversation, managers);
  } else if (isDm(conversation)) {
    const managers = {
      aiManager: new AIManagerImpl(aiService),
      defiManager: new DeFiManagerImpl(defiService),
      socialManager: SocialManagerImpl.getInstance(client)
    };
    await handleDirectMessage(message, conversation, managers);
  }
}

/**
 * Initialize the agent with CDP Agentkit
 */
async function initializeAgent(
  userId: string,
): Promise<{ agent: Agent; config: AgentConfig }> {
  try {
    const llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.7,
    });

    const config = {
      apiKeyName: CDP_API_KEY_NAME,
      apiKeyPrivateKey: CDP_API_KEY_PRIVATE_KEY.replace(/\\n/g, "\n"),
      networkId: NETWORK_ID || "base-sepolia",
    };

    const walletProvider = await CdpWalletProvider.configureWithWallet(config);

    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        walletActionProvider(),
        erc20ActionProvider(),
        cdpApiActionProvider({
          apiKeyId: CDP_API_KEY_NAME,
          apiKeySecret: CDP_API_KEY_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        cdpWalletActionProvider({
          apiKeyId: CDP_API_KEY_NAME,
          apiKeySecret: CDP_API_KEY_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      ],
    });

    const langchainTools = await getLangChainTools(agentkit);
    
    // Transform tools to match expected format for createReactAgent
    const tools = langchainTools.map(tool => ({
      func: async (input: any) => {
        try {
          return await tool.invoke(input);
        } catch (error) {
          console.error(`Error executing tool ${tool.name}:`, error);
          return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      },
      // Copy all original tool properties including name and description
      ...tool
    }));

    memoryStore[userId] = new MemorySaver();

    const agentConfig: AgentConfig = {
      configurable: { thread_id: userId },
    };

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memoryStore[userId],
      messageModifier: `
        You are CryptoConnect, a Social Trading & Community Building Agent that helps users with trading and community management.
        You can interact with the blockchain using Coinbase Developer Platform AgentKit.

        When users interact with you:
        1. Be friendly and professional
        2. Help them with trading and community management
        3. Use the available tools to perform actions
        4. Explain what you're doing in simple terms
        5. Always prioritize security and best practices
      `,
    });

    agentStore[userId] = agent;

    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    console.log('Starting CryptoConnect agent...');
    
    // Initialize XMTP client first
    const client = await initializeXmtpClient();
    
    // Initialize all services
    const aiService = new AIService();
    const defiService = DeFiService.getInstance();
    const analyticsService = new AnalyticsService(client);
    const socialManager = SocialManagerImpl.getInstance(client);
    
    // Initialize services after client is created
    const services: ServiceDependencies = {
      aiService,
      defiService,
      analyticsService,
      socialManager
    };

    // Start message listener with initialized services
    await startMessageListener(client);
    
    console.log('CryptoConnect agent is running. Press Ctrl+C to exit.');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      console.log('Shutting down CryptoConnect agent...');
      process.exit(0);
    });
    
    // Keep the process alive
    await new Promise(() => {});
  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error("Error in main:", error);
  process.exit(1);
});