import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { SimulationService } from "./simulation.service";

const TickConfigSchema = z.object({
  influenceRate: z.number().min(0).max(1).optional(),
  minEdgeWeight: z.number().min(0).max(1).optional(),
}).optional();

export class SimulationController {
  constructor(private service: SimulationService) {}

  registerRoutes(app: FastifyInstance): void {
    app.post("/simulate/:userId", this.tick.bind(this));
  }

  private async tick(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    const { userId } = request.params;
    const parsed = TickConfigSchema.safeParse(request.body);
    const config = parsed.success ? parsed.data : undefined;
    const result = await this.service.tick(userId, config ?? undefined);
    reply.send(result);
  }
}
