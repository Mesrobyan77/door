export type AppError = {
  code: string;
  message: string;
};

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err(code: string, message: string): Result<never> {
  return { ok: false, error: { code, message } };
}
