import type { FastifyInstance } from "fastify";
import { LLMVendorStrategy } from "@/llm/strategy";
import { LLM_VENDOR, GEMINI_MODEL } from "@/config/constants";
import type { MemoryService } from "@/modules/memory/memory.service";
import { AgentService } from "@/modules/agent/agent.service";
import { AgentController } from "@/modules/agent/agent.controller";

export class AgentModule {
  static register(app: FastifyInstance, memoryService: MemoryService): void {
    const llm = new LLMVendorStrategy().resolve(LLM_VENDOR, GEMINI_MODEL);
    const agentService = new AgentService(llm, memoryService);
    new AgentController(agentService).registerRoutes(app);
  }
}
