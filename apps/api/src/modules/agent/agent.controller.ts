import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ChatRequestSchema } from "@/modules/agent/dtos/chat.dto";
import type { AgentService } from "@/modules/agent/agent.service";

export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  async chat(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = ChatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    const result = await this.agentService.chat(parsed.data);
    reply.send(result);
  }

  registerRoutes(app: FastifyInstance): void {
    app.post("/chat", this.chat.bind(this));
  }
}
