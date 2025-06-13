import { PortfolioSnapshot } from '../defi/portfolioTracker';
import { LeaderboardService } from './leaderboard';
import { config } from '../config/config';

export interface Competition {
  id: string;
  name: string;
  description: string;
  startTime: number;
  endTime: number;
  participants: string[]; // Wallet addresses
  rules: {
    minTrades?: number;
    allowedTokens?: string[];
    maxLeverage?: number;
    // Add more competition rules as needed
  };
  status: 'upcoming' | 'active' | 'completed';
  prizes?: {
    rank: number;
    description: string;
    tokenAddress?: string;
    amount?: number;
  }[];
  createdAt: number;
  updatedAt: number;
}

export interface CompetitionEntry {
  walletAddress: string;
  username?: string;
  portfolioStart: PortfolioSnapshot;
  portfolioCurrent: PortfolioSnapshot;
  trades: Trade[];
  metrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    // Add more metrics as needed
  };
  lastUpdated: number;
}

interface Trade {
  id: string;
  timestamp: number;
  baseToken: string;
  quoteToken: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  fee: number;
  status: 'open' | 'closed' | 'liquidated';
  pnl?: number;
  pnlPercentage?: number;
}

export class TradingCompetitionService {
  private static instance: TradingCompetitionService;
  private competitions: Map<string, Competition>;
  private entries: Map<string, CompetitionEntry>; // competitionId:wallet -> entry
  private leaderboardService: LeaderboardService;

  private constructor() {
    this.competitions = new Map();
    this.entries = new Map();
    this.leaderboardService = LeaderboardService.getInstance();
  }

  public static getInstance(): TradingCompetitionService {
    if (!TradingCompetitionService.instance) {
      TradingCompetitionService.instance = new TradingCompetitionService();
    }
    return TradingCompetitionService.instance;
  }

  public createCompetition(competition: Omit<Competition, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Competition {
    const competitionId = `comp_${Date.now()}`;
    const now = Date.now();
    
    const newCompetition: Competition = {
      ...competition,
      id: competitionId,
      status: competition.startTime <= now ? 'active' : 'upcoming',
      createdAt: now,
      updatedAt: now,
    };

    this.competitions.set(competitionId, newCompetition);
    return newCompetition;
  }

  public joinCompetition(competitionId: string, walletAddress: string, initialPortfolio: PortfolioSnapshot): boolean {
    const competition = this.competitions.get(competitionId);
    if (!competition) return false;
    
    if (competition.status !== 'upcoming' && competition.status !== 'active') {
      return false;
    }
    
    if (competition.participants.includes(walletAddress)) {
      return false; // Already joined
    }
    
    // Add participant
    competition.participants.push(walletAddress);
    competition.updatedAt = Date.now();
    
    // Create competition entry
    const entry: CompetitionEntry = {
      walletAddress,
      portfolioStart: { ...initialPortfolio },
      portfolioCurrent: { ...initialPortfolio },
      trades: [],
      metrics: {
        totalReturn: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        winRate: 0,
      },
      lastUpdated: Date.now(),
    };
    
    this.entries.set(`${competitionId}:${walletAddress}`, entry);
    
    return true;
  }

  public recordTrade(
    competitionId: string,
    walletAddress: string,
    trade: Omit<Trade, 'id' | 'timestamp' | 'status' | 'pnl' | 'pnlPercentage'>
  ): boolean {
    const entry = this.getCompetitionEntry(competitionId, walletAddress);
    if (!entry) return false;
    
    const competition = this.competitions.get(competitionId);
    if (!competition || competition.status !== 'active') {
      return false;
    }
    
    // Add the trade
    const tradeWithId: Trade = {
      ...trade,
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: 'open',
    };
    
    entry.trades.push(tradeWithId);
    this.updateEntryMetrics(entry);
    
    return true;
  }

  public updatePortfolio(competitionId: string, walletAddress: string, newPortfolio: PortfolioSnapshot): void {
    const entry = this.getCompetitionEntry(competitionId, walletAddress);
    if (!entry) return;
    
    entry.portfolioCurrent = newPortfolio;
    entry.lastUpdated = Date.now();
    
    // Update entry metrics
    this.updateEntryMetrics(entry);
    
    // Update leaderboard
    this.leaderboardService.updatePortfolioSnapshot(walletAddress, newPortfolio);
  }

  private updateEntryMetrics(entry: CompetitionEntry): void {
    const { portfolioStart, portfolioCurrent, trades } = entry;
    
    // Calculate total return
    const startValue = portfolioStart.totalValue;
    const currentValue = portfolioCurrent.totalValue;
    const totalReturn = ((currentValue - startValue) / startValue) * 100;
    
    // Calculate win rate
    const closedTrades = trades.filter(t => t.status === 'closed');
    const winRate = closedTrades.length > 0 
      ? (closedTrades.filter(t => (t.pnl || 0) > 0).length / closedTrades.length) * 100 
      : 0;
    
    // Calculate max drawdown (simplified)
    // In a real implementation, you'd track the peak and trough values over time
    const maxDrawdown = 0; // Placeholder
    
    // Calculate Sharpe ratio (simplified)
    const sharpeRatio = 0; // Placeholder - would need risk-free rate and return volatility
    
    // Update entry metrics
    entry.metrics = {
      totalReturn,
      winRate,
      maxDrawdown,
      sharpeRatio,
    };
  }

  public getCompetitionLeaderboard(competitionId: string): CompetitionEntry[] {
    const competition = this.competitions.get(competitionId);
    if (!competition) return [];
    
    const entries = competition.participants
      .map(wallet => this.getCompetitionEntry(competitionId, wallet))
      .filter((entry): entry is CompetitionEntry => entry !== null)
      .sort((a, b) => b.metrics.totalReturn - a.metrics.totalReturn);
    
    // Update ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
    
    return entries;
  }

  public getCompetition(competitionId: string): Competition | null {
    return this.competitions.get(competitionId) || null;
  }

  public getActiveCompetitions(): Competition[] {
    const now = Date.now();
    return Array.from(this.competitions.values())
      .filter(comp => comp.status === 'active' || (comp.startTime <= now && comp.endTime >= now));
  }

  public getUpcomingCompetitions(): Competition[] {
    const now = Date.now();
    return Array.from(this.competitions.values())
      .filter(comp => comp.startTime > now && comp.status === 'upcoming')
      .sort((a, b) => a.startTime - b.startTime);
  }

  public getCompletedCompetitions(): Competition[] {
    const now = Date.now();
    return Array.from(this.competitions.values())
      .filter(comp => comp.endTime < now && comp.status !== 'completed')
      .sort((a, b) => b.endTime - a.endTime);
  }

  private getCompetitionEntry(competitionId: string, walletAddress: string): CompetitionEntry | null {
    return this.entries.get(`${competitionId}:${walletAddress}`) || null;
  }

  // Periodically check and update competition statuses
  public startCompetitionMonitor(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
    return setInterval(() => {
      const now = Date.now();
      
      for (const [id, competition] of this.competitions.entries()) {
        let statusChanged = false;
        
        if (competition.status === 'upcoming' && now >= competition.startTime) {
          competition.status = 'active';
          statusChanged = true;
        }
        
        if (competition.status === 'active' && now >= competition.endTime) {
          competition.status = 'completed';
          statusChanged = true;
          
          // Finalize competition
          this.finalizeCompetition(id);
        }
        
        if (statusChanged) {
          competition.updatedAt = now;
        }
      }
    }, intervalMs);
  }

  private finalizeCompetition(competitionId: string): void {
    const competition = this.competitions.get(competitionId);
    if (!competition) return;
    
    // Finalize all trades and calculate final metrics
    for (const walletAddress of competition.participants) {
      const entry = this.getCompetitionEntry(competitionId, walletAddress);
      if (!entry) continue;
      
      // Close any open trades
      for (const trade of entry.trades) {
        if (trade.status === 'open') {
          trade.status = 'closed';
          // Calculate final P&L for the trade
          // This is simplified - in a real implementation, you'd use actual market data
          trade.pnl = 0;
          trade.pnlPercentage = 0;
        }
      }
      
      // Update metrics one final time
      this.updateEntryMetrics(entry);
    }
    
    // Distribute prizes (in a real implementation, this would interact with smart contracts)
    this.distributePrizes(competitionId);
  }

  private distributePrizes(competitionId: string): void {
    const competition = this.competitions.get(competitionId);
    if (!competition?.prizes?.length) return;
    
    const leaderboard = this.getCompetitionLeaderboard(competitionId);
    
    for (const prize of competition.prizes) {
      const winner = leaderboard[prize.rank - 1];
      if (!winner) continue;
      
      console.log(`Distributing prize to ${winner.walletAddress} (${winner.username || 'unknown'})`);
      console.log(`Prize: ${prize.description}`);
      
      // In a real implementation, you would:
      // 1. Interact with a smart contract to transfer tokens
      // 2. Record the distribution in a database
      // 3. Send a notification to the winner
    }
  }
}
