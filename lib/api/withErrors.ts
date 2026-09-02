import { NextRequest, NextResponse } from "next/server";

// Route handlers throw when the DB/push config is missing or invalid (e.g. a bad DATABASE_URL) —
// without this, Next.js returns an empty 500 with no body, which is nearly impossible to debug
// against a deployed app. This logs server-side and returns the message as JSON instead.
export function withErrors(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (err) {
      console.error(err);
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  };
}
