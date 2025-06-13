import { Client } from "@xmtp/node-sdk";
import { Agent } from "../src/agent";

describe("Agent", () => {
  let agent: Agent;
  let client: Client;

  beforeAll(async () => {
    // Initialize client and agent
    client = await Client.create({
      // Mock client configuration
    });
    agent = new Agent(client);
  });

  test("should initialize successfully", () => {
    expect(agent).toBeDefined();
  });

  test("should process messages", async () => {
    const message = "Show my portfolio";
    const response = await agent.processMessage(message);
    expect(response).toBeDefined();
  });

  test("should handle group messages", async () => {
    const groupMessage = "Create trading group";
    const response = await agent.processMessage(groupMessage);
    expect(response).toContain("group");
  });
}); 