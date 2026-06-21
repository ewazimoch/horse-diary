export const prerender = false;

import type { APIRoute } from "astro";
import { syncHealthEventsEnvelopeSchema } from "@/lib/validation/health-events.schema";
import { syncHealthEvents } from "@/lib/services/health-events.service";
import { verifyHorseOwnership } from "@/lib/services/horses.service";

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
  const parseResult = syncHealthEventsEnvelopeSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: parseResult.error.flatten() }), { status: 400 });
  }

  try {
    const result = await syncHealthEvents(locals.supabase, horseId, parseResult.data.entries);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
