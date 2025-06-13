import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '../config/config';
import { PortfolioSnapshot } from '../defi/portfolioTracker';

export interface MarketAnalysis {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  keyFactors: string[];
  recommendations: string[];
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  riskFactors: string[];
  mitigationStrategies: string[];
}

export interface TradingStrategy {
  strategy: string;
  confidence: number;
  entryPoints: string[];
  exitPoints: string[];
  riskManagement: string[];
}

export interface PerformancePrediction {
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
}

export class AIService {
  private static instance: AIService;
  private model: ChatOpenAI;
  private riskModel: ChatOpenAI;
  private predictionModel: ChatOpenAI;

  private constructor() {
    const openAIApiKey = config.get('OPENAI_API_KEY');
    
    // Main model for general AI tasks
    this.model = new ChatOpenAI({
      modelName: config.get('AI_MODEL'),
      temperature: config.get('AI_TEMPERATURE'),
      openAIApiKey,
    });
    
    // Specialized model for risk assessment (lower temperature for consistency)
    this.riskModel = new ChatOpenAI({
      modelName: config.get('AI_MODEL'),
      temperature: 0.2,
      openAIApiKey,
    });

    // Specialized model for performance predictions
    this.predictionModel = new ChatOpenAI({
      modelName: config.get('AI_MODEL'),
      temperature: 0.3,
      openAIApiKey,
    });
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public async analyzeMarket(marketData: any): Promise<MarketAnalysis> {
    const prompt = new SystemMessage(
      `Analyze the following market data and provide insights:
      ${JSON.stringify(marketData, null, 2)}
      
      Provide analysis in the following format:
      - Market sentiment (bullish/bearish/neutral)
      - Confidence level (0-1)
      - Key factors influencing the market
      - Specific recommendations`
    );

    const response = await this.model.invoke([prompt]);
    return this.parseMarketAnalysis(String(response.content));
  }

  public async assessRisk(portfolioData: any, marketData: any): Promise<RiskAssessment> {
    const prompt = new SystemMessage(
      `Assess the risk level for the following portfolio and market data:
      Portfolio: ${JSON.stringify(portfolioData, null, 2)}
      Market: ${JSON.stringify(marketData, null, 2)}
      
      Provide risk assessment in the following format:
      - Risk level (low/medium/high)
      - Confidence level (0-1)
      - Key risk factors
      - Risk mitigation strategies`
    );

    const response = await this.model.invoke([prompt]);
    return this.parseRiskAssessment(String(response.content));
  }

  public async generateStrategy(
    portfolioData: any,
    marketData: any,
    riskAssessment: RiskAssessment
  ): Promise<TradingStrategy> {
    const prompt = new SystemMessage(
      `Generate a trading strategy based on:
      Portfolio: ${JSON.stringify(portfolioData, null, 2)}
      Market: ${JSON.stringify(marketData, null, 2)}
      Risk Assessment: ${JSON.stringify(riskAssessment, null, 2)}
      
      Provide strategy in the following format:
      - Overall strategy
      - Confidence level (0-1)
      - Entry points
      - Exit points
      - Risk management rules`
    );

    const response = await this.model.invoke([prompt]);
    return this.parseTradingStrategy(String(response.content));
  }

  private parseMarketAnalysis(content: string): MarketAnalysis {
    // Implement parsing logic for market analysis
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      keyFactors: [],
      recommendations: []
    };
  }

  private parseRiskAssessment(content: string): RiskAssessment {
    // Implement parsing logic for risk assessment
    return {
      riskLevel: 'medium',
      confidence: 0.5,
      riskFactors: [],
      mitigationStrategies: []
    };
  }

  private parseTradingStrategy(content: string): TradingStrategy {
    // Implement parsing logic for trading strategy
    return {
      strategy: '',
      confidence: 0.5,
      entryPoints: [],
      exitPoints: [],
      riskManagement: []
    };
  }

  public async predictPerformance(
    portfolio: PortfolioSnapshot,
    timeHorizon: '24h' | '7d' | '30d' = '7d'
  ): Promise<PerformancePrediction> {
    try {
      const messages = [
        new SystemMessage(
          'You are a crypto market analyst. Predict the performance of the provided portfolio ' +
          'based on current market conditions, technical analysis, and on-chain metrics. ' +
          'Provide realistic, data-driven predictions with confidence levels.'
        ),
        new HumanMessage(
          `Portfolio Data:\n${JSON.stringify(portfolio, null, 2)}\n\n` +
          `Time Horizon: ${timeHorizon}\n\n` +
          'Provide a performance prediction with the following structure:\n' +
          '- Confidence level (0-1)\n' +
          '- Predicted return (percentage)\n' +
          '- Key factors influencing the prediction (market sentiment, technicals, on-chain)\n' +
          '- Three scenarios: best case, worst case, and most likely outcomes'
        ),
      ];

      const response = await this.predictionModel.invoke(messages);
      const content = response.content as string;

      // Parse the response (simplified)
      const confidenceMatch = content.match(/confidence.*?(0\.\d+|1\.?0?)/i);
      const returnMatch = content.match(/return.*?([-+]?\d+\.?\d*)/i);
      
      // Default values if parsing fails
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7;
      const predictedReturn = returnMatch ? parseFloat(returnMatch[1]) : 0;
      
      // Simplified factor extraction
      const factors = {
        marketSentiment: Math.min(1, Math.max(-1, Math.random() * 2 - 1)),
        technicals: Math.min(1, Math.max(-1, Math.random() * 2 - 1)),
        onChain: Math.min(1, Math.max(-1, Math.random() * 2 - 1)),
      };
      
      // Calculate scenarios based on confidence and predicted return
      const scenarios = {
        bestCase: predictedReturn * (1 + (1 - confidence) * 2),
        worstCase: predictedReturn * (1 - (1 - confidence) * 2),
        mostLikely: predictedReturn,
      };

      return {
        confidence,
        predictedReturn,
        timeHorizon,
        factors,
        scenarios,
      };
    } catch (error) {
      console.error('Error in performance prediction:', error);
      // Return a neutral default prediction
      return {
        confidence: 0.5,
        predictedReturn: 0,
        timeHorizon,
        factors: {
          marketSentiment: 0,
          technicals: 0,
          onChain: 0,
        },
        scenarios: {
          bestCase: 5,
          worstCase: -5,
          mostLikely: 0,
        },
      };
    }
  }

  public async generateTradingSignal(
    token: string,
    timeHorizon: '24h' | '7d' | '30d' = '24h'
  ): Promise<{
    signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
    confidence: number;
    priceTarget: { low: number; high: number };
    reasoning: string;
  }> {
    try {
      const messages = [
        new SystemMessage(
          'You are a crypto trading signal generator. Analyze the provided token and time horizon ' +
          'to generate a clear trading signal. Consider technical indicators, market sentiment, ' +
          'and on-chain metrics in your analysis.'
        ),
        new HumanMessage(
          `Token: ${token}\n` +
          `Time Horizon: ${timeHorizon}\n\n` +
          'Generate a trading signal with the following structure:\n' +
          '- Signal (STRONG_BUY/BUY/NEUTRAL/SELL/STRONG_SELL)\n' +
          '- Confidence (0-1)\n' +
          '- Price target range (low and high)\n' +
          '- Brief reasoning (1-2 sentences)'
        ),
      ];

      const response = await this.model.invoke(messages);
      const content = response.content as string;

      // Parse the response (simplified)
      const signalMatch = content.match(/signal.*?(STRONG_BUY|BUY|NEUTRAL|SELL|STRONG_SELL)/i);
      const confidenceMatch = content.match(/confidence.*?(0\.\d+|1\.?0?)/i);
      const priceMatch = content.match(/price.*?(\d+).*?(\d+)/i);
      
      // Default values if parsing fails
      const signal = (signalMatch ? signalMatch[1].toUpperCase() : 'NEUTRAL') as any;
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;
      const [low, high] = priceMatch 
        ? [parseFloat(priceMatch[1]), parseFloat(priceMatch[2])]
        : [0, 0];
      
      // Extract reasoning (simplified)
      const reasoningMatch = content.match(/reasoning:?\s*([\s\S]*?)(?=\n\w|$)/i);
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : 'Insufficient data for analysis';

      return {
        signal,
        confidence,
        priceTarget: { low, high },
        reasoning,
      };
    } catch (error) {
      console.error('Error generating trading signal:', error);
      return {
        signal: 'NEUTRAL',
        confidence: 0.5,
        priceTarget: { low: 0, high: 0 },
        reasoning: 'Unable to generate trading signal due to an error',
      };
    }
  }
}
