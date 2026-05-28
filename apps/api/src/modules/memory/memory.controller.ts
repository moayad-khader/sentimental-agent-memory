import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { IngestRequestDto } from "@/modules/memory/dtos/ingest.dto";
import type { MemoryService } from "@/modules/memory/memory.service";

export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  async ingest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = IngestRequestDto.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    const result = await this.memoryService.ingest(parsed.data);
    reply.send(result);
  }

  async getMemory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId } = request.params as { userId: string };
    const memory = await this.memoryService.getMemory(userId);
    reply.send(memory);
  }

  async getHistory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId } = request.params as { userId: string };
    const history = await this.memoryService.getHistory(userId);
    reply.send(history);
  }

  registerRoutes(app: FastifyInstance): void {
    app.post("/ingest", this.ingest.bind(this));
    app.get("/memory/:userId", this.getMemory.bind(this));
    app.get("/history/:userId", this.getHistory.bind(this));
  }
}
