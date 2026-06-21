export const prerender = false;

import type { APIRoute } from "astro";
import { updateDailyLogSchema } from "@/lib/validation/daily-logs.schema";
import { deleteDailyLog, getDailyLog, updateDailyLog } from "@/lib/services/daily-logs.service";
import { verifyHorseOwnership } from "@/lib/services/horses.service";

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { horseId, id } = params;
  if (!horseId || !id) {
    return new Response(JSON.stringify({ error: "Missing path parameters" }), { status: 400 });
  }

  const owns = await verifyHorseOwnership(locals.supabase, horseId);
  if (!owns) {
    return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
  }

  try {
    const log = await getDailyLog(locals.supabase, horseId, id);
    if (!log) {
      return new Response(JSON.stringify({ error: "Daily log not found" }), { status: 404 });
    }
    return new Response(JSON.stringify({ data: log }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { horseId, id } = params;
  if (!horseId || !id) {
    return new Response(JSON.stringify({ error: "Missing path parameters" }), { status: 400 });
  }

  const owns = await verifyHorseOwnership(locals.supabase, horseId);
  if (!owns) {
    return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parseResult = updateDailyLogSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: parseResult.error.flatten() }), { status: 400 });
  }

  try {
    const log = await updateDailyLog(locals.supabase, horseId, id, parseResult.data);
    if (!log) {
      return new Response(JSON.stringify({ error: "Daily log not found" }), { status: 404 });
    }
    return new Response(JSON.stringify({ data: log }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { horseId, id } = params;
  if (!horseId || !id) {
    return new Response(JSON.stringify({ error: "Missing path parameters" }), { status: 400 });
  }

  const owns = await verifyHorseOwnership(locals.supabase, horseId);
  if (!owns) {
    return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
  }

  const existing = await getDailyLog(locals.supabase, horseId, id).catch(() => null);
  if (!existing) {
    return new Response(JSON.stringify({ error: "Daily log not found" }), { status: 404 });
  }

  try {
    await deleteDailyLog(locals.supabase, horseId, id);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
