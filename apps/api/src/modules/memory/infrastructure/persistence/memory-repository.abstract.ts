import type { MemoryResponseDto } from "@/modules/memory/dtos/memory.dto";

export interface IMemoryRepository {
  getMemory(userId: string): Promise<MemoryResponseDto>;
}
