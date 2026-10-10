import { NextResponse, type NextRequest } from "next/server";
import { runBusinessStatusSweep } from "../../../(app)/actions";

// The sweep makes one Google call per place, sequentially, so give it room.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Weekly health check. Vercel Cron calls this on the schedule in
 * vercel.json. Authorised by a bearer token: Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>` automatically when the CRON_SECRET
 * env var is set. As a fallback it also accepts genuine Vercel Cron
 * requests, which carry an `x-vercel-cron` header that Vercel strips from
 * any external request — so this endpoint can't be triggered from outside.
 */
function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    return req.headers.get("authorization") === `Bearer ${secret}`;
  }
  return req.headers.get("x-vercel-cron") != null;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runBusinessStatusSweep();
  return NextResponse.json({ ok: true, ...summary });
}
