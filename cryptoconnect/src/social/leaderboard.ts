import { PortfolioSnapshot } from '../defi/portfolioTracker';
import { config } from '../config/config';

export interface LeaderboardEntry {
  walletAddress: string;
  username?: string;
  totalValue: number;
  performance24h: number;
  performance7d: number;
  performance30d: number;
  rank: number;
  lastUpdated: number;
}

export class LeaderboardService {
  private static instance: LeaderboardService;
  private leaderboards: Map<string, LeaderboardEntry[]>; // groupId -> leaderboard
  private userProfiles: Map<string, { username: string; avatar?: string }>;
  private portfolioSnapshots: Map<string, PortfolioSnapshot>; // wallet -> latest snapshot

  private constructor() {
    this.leaderboards = new Map();
    this.userProfiles = new Map();
    this.portfolioSnapshots = new Map();
  }

  public static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  public updatePortfolioSnapshot(walletAddress: string, snapshot: PortfolioSnapshot): void {
    this.portfolioSnapshots.set(walletAddress, snapshot);
  }

  public updateUserProfile(
    walletAddress: string,
    profile: { username: string; avatar?: string }
  ): void {
    this.userProfiles.set(walletAddress, profile);
  }

  public updateLeaderboard(groupId: string, walletAddresses: string[]): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];

    // Create entries for each wallet
    for (const walletAddress of walletAddresses) {
      const snapshot = this.portfolioSnapshots.get(walletAddress);
      if (!snapshot) continue;

      const profile = this.userProfiles.get(walletAddress) || {};

      entries.push({
        walletAddress,
        username: profile.username || `User-${walletAddress.slice(0, 6)}`,
        totalValue: snapshot.totalValue,
        performance24h: snapshot.performance24h,
        performance7d: snapshot.performance7d,
        performance30d: snapshot.performance30d,
        rank: 0, // Will be set after sorting
        lastUpdated: snapshot.timestamp,
      });
    }

    // Sort by total value (descending)
    entries.sort((a, b) => b.totalValue - a.totalValue);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Store leaderboard
    this.leaderboards.set(groupId, entries);

    return entries;
  }

  public getLeaderboard(groupId: string, limit = 10): LeaderboardEntry[] {
    const leaderboard = this.leaderboards.get(groupId) || [];
    return leaderboard.slice(0, limit);
  }

  public getUserRank(groupId: string, walletAddress: string): number | null {
    const leaderboard = this.leaderboards.get(groupId);
    if (!leaderboard) return null;
    
    const entry = leaderboard.find(e => e.walletAddress.toLowerCase() === walletAddress.toLowerCase());
    return entry ? entry.rank : null;
  }

  public getLeaderboardSummary(groupId: string): {
    totalParticipants: number;
    totalValue: number;
    bestPerformer: LeaderboardEntry | null;
    worstPerformer: LeaderboardEntry | null;
    updatedAt: number;
  } {
    const leaderboard = this.leaderboards.get(groupId) || [];
    
    if (leaderboard.length === 0) {
      return {
        totalParticipants: 0,
        totalValue: 0,
        bestPerformer: null,
        worstPerformer: null,
        updatedAt: Date.now(),
      };
    }

    const totalValue = leaderboard.reduce((sum, entry) => sum + entry.totalValue, 0);
    const bestPerformer = [...leaderboard].sort((a, b) => b.performance7d - a.performance7d)[0];
    const worstPerformer = [...leaderboard].sort((a, b) => a.performance7d - b.performance7d)[0];
    const updatedAt = Math.max(...leaderboard.map(e => e.lastUpdated));

    return {
      totalParticipants: leaderboard.length,
      totalValue,
      bestPerformer,
      worstPerformer,
      updatedAt,
    };
  }

  // Get performance distribution for charting
  public getPerformanceDistribution(groupId: string): {
    range: string;
    count: number;
  }[] {
    const leaderboard = this.leaderboards.get(groupId) || [];
    const ranges = [
      { min: -Infinity, max: -20, label: '< -20%' },
      { min: -20, max: -10, label: '-20% to -10%' },
      { min: -10, max: 0, label: '-10% to 0%' },
      { min: 0, max: 10, label: '0% to 10%' },
      { min: 10, max: 20, label: '10% to 20%' },
      { min: 20, max: Infinity, label: '> 20%' },
    ];

    // Initialize counts
    const distribution = ranges.map(range => ({
      range: range.label,
      count: 0,
    }));

    // Count users in each range
    for (const entry of leaderboard) {
      const performance = entry.performance7d;
      const rangeIndex = ranges.findIndex(
        range => performance >= range.min && performance < range.max
      );
      
      if (rangeIndex !== -1) {
        distribution[rangeIndex].count++;
      }
    }

    return distribution;
  }
}
