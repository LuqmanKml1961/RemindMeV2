import { NextRequest, NextResponse } from "next/server";

// Route handlers throw when the DB/push config is missing or invalid (e.g. a bad DATABASE_URL) —
// without this, Next.js returns an empty 500 with no body, which is nearly impossible to debug
// against a deployed app. Errors are logged server-side; the client only ever sees a safe message.
export class BadRequestError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

// A 401 for when a request fails device-token verification (see verifyDevice in lib/push/store).
export class UnauthorizedError extends Error {
  status = 401;

  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// Reads and parses a JSON body, turning a malformed/empty body into a clean 400 instead of a 500.
export async function readJsonBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequestError("invalid JSON body");
  }
}

function errorStatus(err: unknown): number {
  if (err instanceof BadRequestError || err instanceof UnauthorizedError) return err.status;
  if (err instanceof Error) {
    const status = (err as Error & { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return 500;
}

export function withErrors(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (err) {
      console.error(err);
      const unsafeStatus = errorStatus(err);
      const status = unsafeStatus >= 400 && unsafeStatus < 600 ? unsafeStatus : 500;
      const message =
        status >= 500 && process.env.NODE_ENV === "production"
          ? "internal server error"
          : err instanceof Error
            ? err.message
            : String(err);
      return NextResponse.json({ error: message }, { status });
    }
  };
}