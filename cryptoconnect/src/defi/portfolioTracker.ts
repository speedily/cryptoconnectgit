import { Address, createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';
import { config } from '../config/config';
import { aiService } from '../ai';

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  price: number;
  value: number;
}

export interface PortfolioSnapshot {
  walletAddress: string;
  timestamp: number;
  tokens: TokenBalance[];
  totalValue: number;
  performance24h: number;
  performance7d: number;
  performance30d: number;
  riskAssessment?: {
    score: number;
    level: 'Low' | 'Moderate' | 'High' | 'Very High';
    factors: {
      concentration: number;
      volatility: number;
      leverage: number;
      liquidity: number;
    };
    recommendations: string[];
  };
  performancePrediction?: {
    confidence: number;
    predictedReturn: number;
    timeHorizon: '24h' | '7d' | '30d';
    factors: {
      marketSentiment: number;
      technicals: number;
      onChain: number;
    };
    scenarios: {
      bestCase: number;
      worstCase: number;
      mostLikely: number;
    };
  };
}

// Common ERC20 ABI fragments
const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]);

// Common tokens on Base
const COMMON_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { symbol: 'USDC', decimals: 6 },
  '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': { symbol: 'DAI', decimals: 18 },
};

// Type-safe client that handles all transaction types
type SafePublicClient = ReturnType<typeof createPublicClient> & {
  getBlock: (args: Parameters<ReturnType<typeof createPublicClient>['getBlock']>[0]) => 
    Promise<Awaited<ReturnType<ReturnType<typeof createPublicClient>['getBlock']>>>
};

export class PortfolioTracker {
  private client: SafePublicClient;
  private snapshots: Map<string, PortfolioSnapshot[]>; // wallet -> snapshots
  private priceCache: Map<string, { price: number; timestamp: number }>;
  private portfolioCache: Map<string, { portfolio: PortfolioSnapshot; timestamp: number }>;
  private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Create the client with type assertion
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    }) as unknown as SafePublicClient;
    
    this.snapshots = new Map();
    this.priceCache = new Map();
    this.portfolioCache = new Map();
  }

  public async getPortfolio(
    walletAddress: string,
    includeAnalysis: boolean = false
  ): Promise<PortfolioSnapshot> {
    try {
      // Check cache first
      const cached = this.portfolioCache.get(walletAddress);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.portfolio;
      }

      const balances = await this.getTokenBalances(walletAddress);
      const totalValue = balances.reduce((sum, token) => sum + token.value, 0);

      const snapshot: PortfolioSnapshot = {
        walletAddress,
        timestamp: Date.now(),
        tokens: balances,
        totalValue,
        performance24h: 0, // Will be calculated on next snapshot
        performance7d: 0, // Will be calculated on next snapshot
        performance30d: 0, // Will be calculated on next snapshot
        riskAssessment: {
          score: 0,
          level: 'Low',
          factors: {
            concentration: 0,
            volatility: 0,
            leverage: 0,
            liquidity: 0
          },
          recommendations: []
        }
      };

      // Add AI analysis if requested
      if (includeAnalysis) {
        try {
          // Get risk assessment
          const riskAssessment = await aiService.assessRisk(snapshot);
          snapshot.riskAssessment = riskAssessment;

          // Get performance prediction
          const performancePrediction = await aiService.predictPerformance(snapshot, '7d');
          snapshot.performancePrediction = performancePrediction;
        } catch (error) {
          console.error('Error generating AI analysis:', error);
          // Continue without AI analysis if there's an error
        }
      }

      // Store snapshot and calculate performance
      this.storeSnapshot(walletAddress, snapshot);

      // Cache the portfolio
      this.portfolioCache.set(walletAddress, {
        portfolio: snapshot,
        timestamp: Date.now(),
      });

      return snapshot;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      throw error;
    }
  }

  public async getPortfolioWithAnalysis(walletAddress: string): Promise<PortfolioSnapshot> {
    return this.getPortfolio(walletAddress, true);
  }

  private storeSnapshot(walletAddress: string, snapshot: PortfolioSnapshot): void {
    const snapshots = this.snapshots.get(walletAddress) || [];

    // Calculate performance if we have previous snapshots
    if (snapshots.length > 0) {
      const previous24h = this.findClosestSnapshot(snapshots, snapshot.timestamp - 24 * 60 * 60 * 1000);
      const previous7d = this.findClosestSnapshot(snapshots, snapshot.timestamp - 7 * 24 * 60 * 60 * 1000);
      const previous30d = this.findClosestSnapshot(snapshots, snapshot.timestamp - 30 * 24 * 60 * 60 * 1000);

      snapshot.performance24h = this.calculatePerformance(previous24h, snapshot);
      snapshot.performance7d = this.calculatePerformance(previous7d, snapshot);
      snapshot.performance30d = this.calculatePerformance(previous30d, snapshot);
    }

    // Store new snapshot (keep last 100 snapshots per wallet)
    snapshots.push(snapshot);
    if (snapshots.length > 100) {
      snapshots.shift();
    }
    this.snapshots.set(walletAddress, snapshots);
  }

  private findClosestSnapshot(snapshots: PortfolioSnapshot[], targetTime: number): PortfolioSnapshot | null {
    if (snapshots.length === 0) return null;

    // Find the closest snapshot before the target time
    let closest: PortfolioSnapshot | null = null;
    for (const snapshot of snapshots) {
      if (snapshot.timestamp <= targetTime) {
        if (!closest || snapshot.timestamp > closest.timestamp) {
          closest = snapshot;
        }
      }
    }

    return closest;
  }

  private calculatePerformance(previous: PortfolioSnapshot | null, current: PortfolioSnapshot): number {
    if (!previous || previous.totalValue === 0) return 0;
    return ((current.totalValue - previous.totalValue) / previous.totalValue) * 100;
  }

  private async getTokenBalances(walletAddress: string): Promise<TokenBalance[]> {
    const balances: TokenBalance[] = [];

    // Get native token balance (ETH)
    const ethBalance = await this.client.getBalance({
      address: walletAddress as Address,
    });

    const ethPrice = await this.getTokenPrice('ethereum');
    const ethValue = Number(ethBalance) / 1e18 * ethPrice;

    balances.push({
      address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      symbol: 'ETH',
      balance: (Number(ethBalance) / 1e18).toString(),
      price: ethPrice,
      value: ethValue,
    });

    // Get ERC20 token balances
    for (const [tokenAddress, tokenInfo] of Object.entries(COMMON_TOKENS)) {
      try {
        const balance = await this.client.readContract({
          address: tokenAddress as Address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [walletAddress as Address],
        });

        if (balance > 0) {
          const price = await this.getTokenPrice(tokenInfo.symbol.toLowerCase());
          const balanceFormatted = Number(balance) / (10 ** tokenInfo.decimals);
          const value = balanceFormatted * price;

          balances.push({
            address: tokenAddress,
            symbol: tokenInfo.symbol,
            balance: balanceFormatted.toString(),
            price,
            value,
          });
        }
      } catch (error) {
        console.error(`Error fetching balance for token ${tokenInfo.symbol}:`, error);
      }
    }

    return balances;
  }

  private async getTokenPrice(symbol: string): Promise<number> {
    const cacheKey = symbol.toLowerCase();
    const cached = this.priceCache.get(cacheKey);

    // Return cached price if it's still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.price;
    }

    try {
      // In a real implementation, you would fetch the price from a price oracle or API
      // This is a simplified example that returns mock data
      const mockPrices: Record<string, number> = {
        'eth': 1800,
        'weth': 1800,
        'usdc': 1,
        'dai': 1,
      };

      const price = mockPrices[cacheKey] || 0;

      // Update cache
      this.priceCache.set(cacheKey, {
        price,
        timestamp: Date.now(),
      });

      return price;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return 0;
    }
  }

  // Get portfolio history for a wallet
  public getPortfolioHistory(walletAddress: string, timeRange: '24h' | '7d' | '30d' = '7d'): PortfolioSnapshot[] {
    const snapshots = this.snapshots.get(walletAddress) || [];
    const now = Date.now();
    let cutoffTime = 0;
    
    switch (timeRange) {
      case '24h':
        cutoffTime = now - 24 * 60 * 60 * 1000;
        break;
      case '30d':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case '7d':
      default:
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
    }
    
    return snapshots.filter(snapshot => snapshot.timestamp >= cutoffTime);
  }
}
