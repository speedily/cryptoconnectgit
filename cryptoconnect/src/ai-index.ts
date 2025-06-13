import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PortfolioData, MarketData } from "./defi-index";

export interface TradingInsight {
  analysis: string;
  recommendation: string;
  confidence: number;
}

export interface MarketAnalysis {
  trend: string;
  support: string;
  resistance: string;
  indicators: string[];
}

export class AIManager {
  private model: ChatOpenAI;

  constructor(apiKey: string) {
    this.model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.7,
      openAIApiKey: apiKey,
    });
  }

  async generateInsights(
    portfolioData: PortfolioData,
    marketData: MarketData
  ): Promise<TradingInsight> {
    try {
      const messages = [
        new SystemMessage(
          "You are a crypto trading expert. Analyze the provided data and give trading insights."
        ),
        new HumanMessage(
          `Portfolio Data:\n${JSON.stringify(portfolioData, null, 2)}\n\nMarket Data:\n${JSON.stringify(marketData, null, 2)}`
        )
      ];

      const response = await this.model.invoke(messages);
      const content = response.content as string;

      // Parse the response
      const analysis = content.match(/Analysis:\s*([^\n]+)/)?.[1] || '';
      const recommendation = content.match(/Recommendation:\s*([^\n]+)/)?.[1] || '';
      const confidenceMatch = content.match(/Confidence:\s*(\d+)%/);
      const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.5;

      return {
        analysis,
        recommendation,
        confidence
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  async analyzeMarket(marketData: MarketData): Promise<MarketAnalysis> {
    try {
      const messages = [
        new SystemMessage(
          "You are a crypto market analyst. Analyze the provided market data and identify key patterns."
        ),
        new HumanMessage(
          `Market Data:\n${JSON.stringify(marketData, null, 2)}`
        )
      ];

      const response = await this.model.invoke(messages);
      const content = response.content as string;

      // Parse the analysis
      const trend = content.match(/Trend:\s*([^\n]+)/)?.[1] || 'Unknown';
      const support = content.match(/Support:\s*([^\n]+)/)?.[1] || 'Unknown';
      const resistance = content.match(/Resistance:\s*([^\n]+)/)?.[1] || 'Unknown';
      const indicatorsMatch = content.match(/Indicators:\s*([^\n]+)/);
      const indicators = indicatorsMatch ? 
        indicatorsMatch[1].split(',').map(i => i.trim()) : 
        [];

      return {
        trend,
        support,
        resistance,
        indicators
      };
    } catch (error) {
      console.error('Error analyzing market:', error);
      throw error;
    }
  }

  async assessRisk(portfolioData: PortfolioData): Promise<number> {
    try {
      const messages = [
        new SystemMessage(
          "You are a risk assessment expert. Evaluate the risk level of the given portfolio on a scale of 1-10."
        ),
        new HumanMessage(`Portfolio Data: ${JSON.stringify(portfolioData)}`)
      ];

      const response = await this.model.invoke(messages);
      const content = response.content as string;
      const riskScore = parseInt(content.match(/\d+/)?.[0] || '5');

      return Math.min(Math.max(riskScore, 1), 10);
    } catch (error) {
      console.error('Error assessing risk:', error);
      throw error;
    }
  }

  /**
   * Extract recommendation from AI response
   */
  private extractRecommendation(content: string): string {
    // Implement recommendation extraction logic
    return "Hold";
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(content: string): number {
    // Implement confidence calculation logic
    return 0.8;
  }

  /**
   * Extract trend from analysis
   */
  private extractTrend(content: string): string {
    // Implement trend extraction logic
    return "Bullish";
  }

  /**
   * Extract support level
   */
  private extractSupport(content: string): string {
    // Implement support extraction logic
    return "0";
  }

  /**
   * Extract resistance level
   */
  private extractResistance(content: string): string {
    // Implement resistance extraction logic
    return "0";
  }

  /**
   * Extract technical indicators
   */
  private extractIndicators(content: string): string[] {
    // Implement indicator extraction logic
    return ["RSI", "MACD"];
  }
}