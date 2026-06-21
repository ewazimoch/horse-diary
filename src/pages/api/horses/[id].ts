export const prerender = false;

import type { APIRoute } from "astro";
import { updateHorseSchema } from "@/lib/validation/horses.schema";
import { getHorse, updateHorse, deleteHorse } from "@/lib/services/horses.service";

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing horse id" }), { status: 400 });
  }

  try {
    const horse = await getHorse(locals.supabase, id);
    if (!horse) {
      return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
    }
    return new Response(JSON.stringify({ data: horse }), {
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

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing horse id" }), { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parseResult = updateHorseSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: parseResult.error.flatten() }), { status: 400 });
  }

  try {
    const horse = await updateHorse(locals.supabase, id, parseResult.data);
    if (!horse) {
      return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
    }
    return new Response(JSON.stringify({ data: horse }), {
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

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing horse id" }), { status: 400 });
  }

  const existing = await getHorse(locals.supabase, id).catch(() => null);
  if (!existing) {
    return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
  }

  try {
    await deleteHorse(locals.supabase, id);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
