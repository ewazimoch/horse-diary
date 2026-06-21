export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { currentWeekMonday, getTimeline, isMonday } from "@/lib/services/timeline.service";
import { verifyHorseOwnership } from "@/lib/services/horses.service";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const timelineQuerySchema = z.object({
  week_start: z
    .string()
    .regex(ISO_DATE_REGEX, "week_start must be YYYY-MM-DD")
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()), "week_start is not a valid date")
    .refine(isMonday, "week_start must be a Monday")
    .optional(),
});

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
  const queryResult = timelineQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!queryResult.success) {
    return new Response(JSON.stringify({ error: queryResult.error.flatten() }), { status: 400 });
  }

  const weekStart = queryResult.data.week_start ?? currentWeekMonday();

  try {
    const result = await getTimeline(locals.supabase, horseId, weekStart);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
};
