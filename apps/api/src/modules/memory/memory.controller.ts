import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { IngestRequestDto } from "@/modules/memory/dtos/ingest.dto";
import type { MemoryService } from "@/modules/memory/memory.service";

export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  async ingest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = IngestRequestDto.safeParse(request.body);
    if (!parsed.success) { reply.status(400).send({ error: parsed.error.flatten() }); return; }
    const result = await this.memoryService.ingest(parsed.data);
    reply.send(result);
  }

  async getMemory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId } = request.params as { userId: string };
    reply.send(await this.memoryService.getMemory(userId));
  }

  async getHistory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId } = request.params as { userId: string };
    reply.send(await this.memoryService.getHistory(userId));
  }

  async archiveSentiment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId, entityId, emotion } = request.params as Record<string, string>;
    await this.memoryService.archiveSentiment(userId, entityId, emotion);
    reply.send({ ok: true });
  }

  async deleteFact(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId, entityId, relation } = request.params as Record<string, string>;
    await this.memoryService.deleteFact(userId, entityId, relation);
    reply.send({ ok: true });
  }

  async deletePreference(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId, entityId } = request.params as Record<string, string>;
    await this.memoryService.deletePreference(userId, entityId);
    reply.send({ ok: true });
  }

  registerRoutes(app: FastifyInstance): void {
    app.post("/ingest", this.ingest.bind(this));
    app.get("/memory/:userId", this.getMemory.bind(this));
    app.get("/history/:userId", this.getHistory.bind(this));
    app.delete("/memory/:userId/sentiment/:entityId/:emotion", this.archiveSentiment.bind(this));
    app.delete("/memory/:userId/fact/:entityId/:relation",     this.deleteFact.bind(this));
    app.delete("/memory/:userId/preference/:entityId",         this.deletePreference.bind(this));
  }
}
