import { DeFiManager } from "../src/defi";
import { AgentKit } from "@coinbase/agentkit";

describe("DeFiManager", () => {
  let defiManager: DeFiManager;
  let agentkit: AgentKit;

  beforeAll(async () => {
    agentkit = await AgentKit.from({
      // Mock agentkit configuration
    });
    defiManager = new DeFiManager(agentkit);
  });

  test("should get portfolio data", async () => {
    const tokenAddress = "0x123...";
    const portfolioData = await defiManager.getPortfolioData(tokenAddress);
    expect(portfolioData).toHaveProperty("balance");
    expect(portfolioData).toHaveProperty("symbol");
    expect(portfolioData).toHaveProperty("value");
  });

  test("should get market data", async () => {
    const tokenAddress = "0x123...";
    const marketData = await defiManager.getMarketData(tokenAddress);
    expect(marketData).toHaveProperty("price");
    expect(marketData).toHaveProperty("change24h");
    expect(marketData).toHaveProperty("volume24h");
  });

  test("should execute trade", async () => {
    const tokenAddress = "0x123...";
    const amount = "1.0";
    const result = await defiManager.executeTrade(tokenAddress, amount, true);
    expect(result).toBe("Trade executed successfully");
  });
}); 