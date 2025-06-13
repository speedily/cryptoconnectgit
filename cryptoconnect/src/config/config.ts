import * as dotenv from 'dotenv';
import * as path from 'path';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Define schema for environment variables
const envSchema = z.object({
  // Required variables
  XMTP_WALLET_KEY: z.string().min(1, 'Wallet private key is required'),
  XMTP_ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  XMTP_ENV: z.enum(['local', 'dev', 'production']).default('dev'),
  
  // CDP API
  CDP_API_KEY_NAME: z.string().optional(),
  CDP_API_KEY_PRIVATE_KEY: z.string().optional(),
  
  // Network
  NETWORK_ID: z.string().default('base-sepolia'),
  
  // AI Configuration
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gpt-4'),
  AI_TEMPERATURE: z.string().transform(Number).refine(n => n >= 0 && n <= 1, 'Temperature must be between 0 and 1').default('0.7'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Feature flags
  ENABLE_TRADING: z.string().transform(v => v === 'true').default('false'),
  ENABLE_ANALYTICS: z.string().transform(v => v === 'true').default('false'),
});

type EnvConfig = z.infer<typeof envSchema>;

class ConfigManager {
  private static instance: ConfigManager;
  private config: EnvConfig;

  private constructor() {
    try {
      this.config = envSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join('\n');
        throw new Error(`Configuration error:\n${errorMessages}`);
      }
      throw error;
    }
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public get<T extends keyof EnvConfig>(key: T): EnvConfig[T] {
    const value = this.config[key];
    if (value === undefined) {
      throw new Error(`Configuration key ${key} is not defined`);
    }
    return value;
  }

  public getAll(): EnvConfig {
    return { ...this.config };
  }
}

export const config = ConfigManager.getInstance();

// Helper function to validate required environment variables at startup
export function validateEnvironment() {
  try {
    return ConfigManager.getInstance().getAll();
  } catch (error) {
    console.error('❌ Failed to load configuration:');
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('Unknown configuration error');
    }
    process.exit(1);
  }
}
