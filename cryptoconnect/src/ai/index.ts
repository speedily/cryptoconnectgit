import { AIService } from './aiService';

export * from './aiService';

// Initialize AI service
export const aiService = AIService.getInstance();
