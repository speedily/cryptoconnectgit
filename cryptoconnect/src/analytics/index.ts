import { CommunityAnalyticsService } from './communityAnalytics';

// Initialize analytics service
export const communityAnalytics = CommunityAnalyticsService.getInstance();

// Start analytics generation (runs every hour)
communityAnalytics.startAnalyticsGeneration();
