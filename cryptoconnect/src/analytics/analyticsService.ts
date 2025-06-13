import { Client } from "@xmtp/node-sdk";
import { Group, Dm } from "@xmtp/node-sdk";

export interface AnalyticsData {
  timestamp: string;
  type: 'performance' | 'user' | 'trading';
  data: any;
}

export class AnalyticsService {
  private client: Client;
  private analyticsData: AnalyticsData[] = [];

  constructor(client: Client) {
    this.client = client;
  }

  // Performance Analytics
  async trackPerformance(group: Group<unknown> | Dm<unknown>) {
    if (!('isGroup' in group) || !group.isGroup || !('members' in group)) {
      return null; // Skip analytics for DMs
    }
    const groupConversation = group as Group<unknown>;
    const performanceData = {
      timestamp: new Date().toISOString(),
      type: 'performance' as const,
      data: {
        groupId: groupConversation.id,
        messageCount: await this.getMessageCount(groupConversation),
        activeUsers: await this.getActiveUsers(groupConversation),
        responseTime: await this.getAverageResponseTime(groupConversation)
      }
    };
    this.analyticsData.push(performanceData);
    return performanceData;
  }

  // User Analytics
  async trackUserMetrics(group: Group<unknown>) {
    const userData = {
      timestamp: new Date().toISOString(),
      type: 'user' as const,
      data: {
        groupId: group.id,
        totalUsers: await this.getTotalUsers(group),
        newUsers: await this.getNewUsers(group),
        userRetention: await this.getUserRetention(group),
        userActivity: await this.getUserActivity(group)
      }
    };
    this.analyticsData.push(userData);
    return userData;
  }

  // Trading Analytics
  async trackTradingMetrics(group: Group<unknown>) {
    const tradingData = {
      timestamp: new Date().toISOString(),
      type: 'trading' as const,
      data: {
        groupId: group.id,
        tradingVolume: await this.getTradingVolume(group),
        successfulTrades: await this.getSuccessfulTrades(group),
        averageTradeSize: await this.getAverageTradeSize(group),
        popularTokens: await this.getPopularTokens(group)
      }
    };
    this.analyticsData.push(tradingData);
    return tradingData;
  }

  // Helper methods for performance metrics
  private async getMessageCount(conversation: Group<unknown> | Dm<unknown>): Promise<number> {
    const messages = await conversation.messages();
    return messages.length;
  }

  private async getActiveUsers(group: Group<unknown>): Promise<number> {
    const members = await group.members();
    return members.length;
  }

  private async getAverageResponseTime(group: Group<unknown>): Promise<number> {
    const messages = await group.messages();
    let totalResponseTime = 0;
    let responseCount = 0;

    for (let i = 1; i < messages.length; i++) {
      const timeDiff = messages[i].sentAt.getTime() - messages[i-1].sentAt.getTime();
      if (timeDiff < 3600000) { // Only count responses within 1 hour
        totalResponseTime += timeDiff;
        responseCount++;
      }
    }

    return responseCount > 0 ? totalResponseTime / responseCount : 0;
  }

  // Helper methods for user metrics
  private async getTotalUsers(group: Group<unknown>): Promise<number> {
    const members = await group.members();
    return members.length;
  }

  private async getNewUsers(group: Group<unknown>): Promise<number> {
    const members = await group.members();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return members.filter(member => member.inboxId).length; // Count all members since we can't track join date
  }

  private async getUserRetention(group: Group<unknown>): Promise<number> {
    const members = await group.members();
    const activeMembers = members.filter(member => member.permissionLevel > 0); // Members with any permissions are considered active
    return (activeMembers.length / members.length) * 100;
  }

  private async getUserActivity(group: Group<unknown>): Promise<Record<string, number>> {
    const messages = await group.messages();
    const userActivity: Record<string, number> = {};

    messages.forEach(message => {
      const sender = message.senderInboxId;
      userActivity[sender] = (userActivity[sender] || 0) + 1;
    });

    return userActivity;
  }

  // Helper methods for trading metrics
  private async getTradingVolume(group: Group<unknown>): Promise<number> {
    // Implement trading volume calculation
    return 0;
  }

  private async getSuccessfulTrades(group: Group<unknown>): Promise<number> {
    // Implement successful trades calculation
    return 0;
  }

  private async getAverageTradeSize(group: Group<unknown>): Promise<number> {
    // Implement average trade size calculation
    return 0;
  }

  private async getPopularTokens(group: Group<unknown>): Promise<string[]> {
    // Implement popular tokens calculation
    return [];
  }

  // Get analytics data
  getAnalyticsData(): AnalyticsData[] {
    return this.analyticsData;
  }

  // Clear analytics data
  clearAnalyticsData(): void {
    this.analyticsData = [];
  }
} 