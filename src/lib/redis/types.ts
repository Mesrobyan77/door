export type RedisClient = {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { ex?: number; nx?: boolean },
  ): Promise<"OK" | null>;
  del(key: string): Promise<number>;
  /** Atomically reads and deletes a key (single-use token consume). */
  getdel(key: string): Promise<string | null>;
};

export type RedisAdapter = {
  readonly name: string;
  getClient(): RedisClient;
};
