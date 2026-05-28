import { HEBBIAN_DELTA } from "@/config/constants";

export class HebbianEngine {
  readonly delta = HEBBIAN_DELTA;

  pairs<T>(items: T[]): [T, T][] {
    const result: [T, T][] = [];
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++)
        result.push([items[i], items[j]]);
    return result;
  }
}
