export const prerender = false;

import type { APIRoute } from "astro";
import { dailyLogListQuerySchema, upsertDailyLogSchema } from "@/lib/validation/daily-logs.schema";
import { listDailyLogs, upsertDailyLog } from "@/lib/services/daily-logs.service";
import { verifyHorseOwnership } from "@/lib/services/horses.service";

export const GET: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { horseId } = params;
  if (!horseId) {
    return new Response(JSON.stringify({ error: "Missing horse id" }), { status: 400 });
  }

  const owns = await verifyHorseOwnership(locals.supabase, horseId);
  if (!owns) {
    return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
  }

  const url = new URL(request.url);
  const queryResult = dailyLogListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!queryResult.success) {
    return new Response(JSON.stringify({ error: queryResult.error.flatten() }), { status: 400 });
  }

  try {
    const result = await listDailyLogs(locals.supabase, horseId, queryResult.data);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { horseId } = params;
  if (!horseId) {
    return new Response(JSON.stringify({ error: "Missing horse id" }), { status: 400 });
  }

  const owns = await verifyHorseOwnership(locals.supabase, horseId);
  if (!owns) {
    return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parseResult = upsertDailyLogSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: parseResult.error.flatten() }), { status: 400 });
  }

  try {
    const log = await upsertDailyLog(locals.supabase, horseId, parseResult.data);
    return new Response(JSON.stringify({ data: log }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
