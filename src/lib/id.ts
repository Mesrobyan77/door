import { v7 as uuidv7 } from "uuid";

/** Generate a sortable UUIDv7 for new entity primary keys. */
export function createId(): string {
  return uuidv7();
}
