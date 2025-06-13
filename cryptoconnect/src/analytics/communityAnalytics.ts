import { config } from '../config/config';
import { PortfolioSnapshot } from '../defi/portfolioTracker';
import { LeaderboardService } from '../social/leaderboard';
import { TradingCompetitionService } from '../social/tradingCompetition';

interface UserEngagement {
  walletAddress: string;
  messagesSent: number;
  reactionsGiven: number;
  commandsUsed: number;
  lastActive: Date;
  joinDate: Date;
}

interface TokenActivity {
  tokenAddress: string;
  symbol: string;
  buyVolume: number;
  sellVolume: number;
  holders: number;
  priceChange24h: number;
}

export interface CommunityAnalytics {
  // User Metrics
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowthRate: number;
  mostActiveUsers: Array<{ walletAddress: string; username?: string; activityScore: number }>;
  
  // Trading Metrics
  totalVolume24h: number;
  totalTrades24h: number;
  averageTradeSize: number;
  mostTradedTokens: TokenActivity[];
  
  // Portfolio Metrics
  totalPortfolioValue: number;
  averagePortfolioValue: number;
  portfolioDistribution: Array<{ range: string; count: number }>;
  
  // Engagement Metrics
  messagesPerDay: number;
  averageResponseTime: number; // in minutes
  commandUsage: Array<{ command: string; count: number }>;
  
  // Competition Metrics
  activeCompetitions: number;
  totalPrizePool: number;
  averageParticipantsPerCompetition: number;
  
  // Sentiment Analysis (simplified)
  sentimentScore: number; // -1 to 1
  trendingTopics: Array<{ topic: string; mentionCount: number }>;
  
  // Timestamp
  timestamp: number;
}

export class CommunityAnalyticsService {
  private static instance: CommunityAnalyticsService;
  private leaderboardService: LeaderboardService;
  private competitionService: TradingCompetitionService;
  private userEngagement: Map<string, UserEngagement>;
  private tokenActivity: Map<string, TokenActivity>;
  private analyticsHistory: CommunityAnalytics[] = [];
  private readonly MAX_HISTORY = 30; // Keep last 30 days of analytics

  private constructor() {
    this.leaderboardService = LeaderboardService.getInstance();
    this.competitionService = TradingCompetitionService.getInstance();
    this.userEngagement = new Map();
    this.tokenActivity = new Map();
  }

  public static getInstance(): CommunityAnalyticsService {
    if (!CommunityAnalyticsService.instance) {
      CommunityAnalyticsService.instance = new CommunityAnalyticsService();
    }
    return CommunityAnalyticsService.instance;
  }

  public trackMessage(walletAddress: string): void {
    const user = this.getOrCreateUser(walletAddress);
    user.messagesSent += 1;
    user.lastActive = new Date();
    this.userEngagement.set(walletAddress, user);
  }

  public trackCommand(walletAddress: string, command: string): void {
    const user = this.getOrCreateUser(walletAddress);
    user.commandsUsed += 1;
    user.lastActive = new Date();
    this.userEngagement.set(walletAddress, user);
  }

  public trackTrade(
    walletAddress: string,
    baseToken: string,
    quoteToken: string,
    amount: number,
    isBuy: boolean
  ): void {
    const user = this.getOrCreateUser(walletAddress);
    user.lastActive = new Date();
    this.userEngagement.set(walletAddress, user);

    // Track token activity
    const tokenAddress = isBuy ? baseToken : quoteToken;
    const tokenSymbol = this.getTokenSymbol(tokenAddress);
    
    let token = this.tokenActivity.get(tokenAddress);
    if (!token) {
      token = {
        tokenAddress,
        symbol: tokenSymbol,
        buyVolume: 0,
        sellVolume: 0,
        holders: 0,
        priceChange24h: 0,
      };
    }
    
    if (isBuy) {
      token.buyVolume += amount;
    } else {
      token.sellVolume += amount;
    }
    
    this.tokenActivity.set(tokenAddress, token);
  }

  public async generateAnalytics(): Promise<CommunityAnalytics> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get active users (users active in the last 24 hours)
    const activeUsers = Array.from(this.userEngagement.values())
      .filter(user => user.lastActive > oneDayAgo);
    
    // Get new users (joined in the last 24 hours)
    const newUsers = Array.from(this.userEngagement.values())
      .filter(user => user.joinDate > oneDayAgo);
    
    // Calculate user growth rate (simplified)
    const previousDayUsers = this.analyticsHistory[0]?.totalUsers || 0;
    const userGrowthRate = previousDayUsers > 0 
      ? ((this.userEngagement.size - previousDayUsers) / previousDayUsers) * 100 
      : 0;

    // Get most active users
    const mostActiveUsers = Array.from(this.userEngagement.values())
      .map(user => ({
        walletAddress: user.walletAddress,
        activityScore: this.calculateActivityScore(user),
      }))
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 10);

    // Calculate trading metrics
    const totalVolume24h = Array.from(this.tokenActivity.values())
      .reduce((sum, token) => sum + token.buyVolume + token.sellVolume, 0);
    
    // Get most traded tokens
    const mostTradedTokens = Array.from(this.tokenActivity.values())
      .sort((a, b) => (b.buyVolume + b.sellVolume) - (a.buyVolume + a.sellVolume))
      .slice(0, 5);

    // Generate analytics object
    const analytics: CommunityAnalytics = {
      // User Metrics
      totalUsers: this.userEngagement.size,
      activeUsers: activeUsers.length,
      newUsers: newUsers.length,
      userGrowthRate,
      mostActiveUsers,
      
      // Trading Metrics
      totalVolume24h,
      totalTrades24h: mostTradedTokens.reduce((sum, token) => sum + token.buyVolume + token.sellVolume, 0),
      averageTradeSize: mostTradedTokens.length > 0 
        ? totalVolume24h / (mostTradedTokens.length * 2) // Rough estimate
        : 0,
      mostTradedTokens,
      
      // Portfolio Metrics (simplified)
      totalPortfolioValue: 0, // Would be calculated from portfolio data
      averagePortfolioValue: 0, // Would be calculated from portfolio data
      portfolioDistribution: [], // Would be calculated from portfolio data
      
      // Engagement Metrics
      messagesPerDay: activeUsers.reduce((sum, user) => sum + user.messagesSent, 0) / 30, // Average over month
      averageResponseTime: 15, // Hardcoded, would be calculated from message timestamps
      commandUsage: [], // Would be tracked separately
      
      // Competition Metrics
      activeCompetitions: this.competitionService.getActiveCompetitions().length,
      totalPrizePool: 0, // Would be calculated from active competitions
      averageParticipantsPerCompetition: 0, // Would be calculated from competitions
      
      // Sentiment Analysis
      sentimentScore: 0.75, // Hardcoded, would be calculated from message analysis
      trendingTopics: [
        { topic: "NFT", mentionCount: 45 },
        { topic: "DeFi", mentionCount: 38 },
        { topic: "Gaming", mentionCount: 22 },
      ],
      
      timestamp: now.getTime(),
    };
    
    // Store in history
    this.analyticsHistory.unshift(analytics);
    if (this.analyticsHistory.length > this.MAX_HISTORY) {
      this.analyticsHistory.pop();
    }
    
    return analytics;
  }

  public getAnalyticsHistory(days: number = 7): CommunityAnalytics[] {
    return this.analyticsHistory.slice(0, days);
  }

  private getOrCreateUser(walletAddress: string): UserEngagement {
    let user = this.userEngagement.get(walletAddress);
    if (!user) {
      user = {
        walletAddress,
        messagesSent: 0,
        reactionsGiven: 0,
        commandsUsed: 0,
        lastActive: new Date(),
        joinDate: new Date(),
      };
      this.userEngagement.set(walletAddress, user);
    }
    return user;
  }

  private calculateActivityScore(user: UserEngagement): number {
    // Simple scoring algorithm - can be enhanced
    const messagesWeight = 1;
    const commandsWeight = 2;
    const recencyWeight = 0.5;
    
    const daysSinceLastActive = Math.max(1, (Date.now() - user.lastActive.getTime()) / (24 * 60 * 60 * 1000));
    
    return (
      (user.messagesSent * messagesWeight) +
      (user.commandsUsed * commandsWeight) +
      (recencyWeight * (1 / daysSinceLastActive))
    );
  }

  private getTokenSymbol(tokenAddress: string): string {
    // In a real implementation, this would look up the token symbol from a token registry
    // or contract
    const commonTokens: Record<string, string> = {
      '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': 'ETH',
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': 'USDC',
      '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': 'DAI',
    };
    
    return commonTokens[tokenAddress.toLowerCase()] || tokenAddress.slice(0, 6) + '...';
  }

  // Periodically generate analytics (e.g., every hour)
  public startAnalyticsGeneration(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
    // Generate first report immediately
    this.generateAnalytics().catch(console.error);
    
    // Then generate on the specified interval
    return setInterval(() => {
      this.generateAnalytics().catch(console.error);
    }, intervalMs);
  }
}
