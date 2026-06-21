import type { SupabaseClient } from "@/db/supabase.client";
import type {
  DailyLogDTO,
  HealthEventDTO,
  TimelineDailyLogDTO,
  TimelineDayDTO,
  TimelineDTO,
  TimelineHealthEventDTO,
} from "@/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Adds the given number of days to a YYYY-MM-DD string, returning YYYY-MM-DD.
 *  Uses UTC arithmetic to avoid daylight-saving / timezone drift. */
function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayName(dateStr: string): string {
  return DAY_NAMES[new Date(`${dateStr}T00:00:00Z`).getUTCDay()];
}

/** Returns true when the provided YYYY-MM-DD is a Monday (ISO weekday 1). */
export function isMonday(dateStr: string): boolean {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay() === 1;
}

/** The Monday of the current week in YYYY-MM-DD (UTC). */
export function currentWeekMonday(): string {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const diffToMonday = (utcDay + 6) % 7; // days since Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
}

/** Builds the unified 7-day weekly view for one horse. Health events and daily
 *  logs are fetched in parallel, then assembled into exactly 7 day buckets
 *  (Monday–Sunday). is_future is computed as event_date > today. */
export async function getTimeline(supabase: SupabaseClient, horseId: string, weekStart: string): Promise<TimelineDTO> {
  const weekEnd = addDays(weekStart, 6);
  const today = new Date().toISOString().slice(0, 10);

  const [healthEventsResult, dailyLogsResult] = await Promise.all([
    supabase
      .from("health_events")
      .select("id, event_type, event_date, notes, created_at, updated_at")
      .eq("horse_id", horseId)
      .gte("event_date", weekStart)
      .lte("event_date", weekEnd)
      .order("event_date", { ascending: true }),
    supabase
      .from("daily_logs")
      .select("id, log_date, mood_score, activities, notes, created_at, updated_at")
      .eq("horse_id", horseId)
      .gte("log_date", weekStart)
      .lte("log_date", weekEnd),
  ]);

  if (healthEventsResult.error) {
    console.error("[timeline] health_events error:", healthEventsResult.error);
    throw new Error("Failed to fetch timeline");
  }
  if (dailyLogsResult.error) {
    console.error("[timeline] daily_logs error:", dailyLogsResult.error);
    throw new Error("Failed to fetch timeline");
  }

  const healthEvents = healthEventsResult.data ?? [];
  const dailyLogs = dailyLogsResult.data ?? [];

  const days: TimelineDayDTO[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(weekStart, offset);

    const dayHealthEvents: TimelineHealthEventDTO[] = healthEvents
      .filter((event) => event.event_date === date)
      .map((event) => ({
        id: event.id,
        event_type: event.event_type as HealthEventDTO["event_type"],
        event_date: event.event_date,
        notes: event.notes,
        created_at: event.created_at,
        updated_at: event.updated_at,
        is_future: event.event_date > today,
      }));

    const logRow = dailyLogs.find((log) => log.log_date === date);
    const dailyLog: TimelineDailyLogDTO | null = logRow
      ? {
          id: logRow.id,
          log_date: logRow.log_date,
          mood_score: logRow.mood_score as DailyLogDTO["mood_score"],
          activities: logRow.activities,
          notes: logRow.notes,
          created_at: logRow.created_at,
          updated_at: logRow.updated_at,
        }
      : null;

    days.push({
      date,
      day_of_week: dayName(date),
      health_events: dayHealthEvents,
      daily_log: dailyLog,
    });
  }

  return { week_start: weekStart, week_end: weekEnd, days };
}
