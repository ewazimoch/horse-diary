-- ============================================================================
-- migration: 20260416095906_disable_rls_policies
-- purpose:   drop all rls policies created in 20260416120000_initial_schema
--            and disable row level security on all affected tables.
-- tables:    profiles, horses, health_events, daily_logs
-- notes:     this is a destructive change — all per-row access restrictions
--            are removed. tables become fully accessible to any authenticated
--            or anon request that passes through postgrest.
--            re-enable by creating new policies in a follow-up migration.
-- ============================================================================

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------

drop policy if exists "profiles_select_own"  on profiles;
drop policy if exists "profiles_select_anon" on profiles;
drop policy if exists "profiles_update_own"  on profiles;

alter table profiles disable row level security;

-- --------------------------------------------------------------------------
-- horses
-- --------------------------------------------------------------------------

drop policy if exists "horses_select_own"  on horses;
drop policy if exists "horses_select_anon" on horses;
drop policy if exists "horses_insert_own"  on horses;
drop policy if exists "horses_update_own"  on horses;
drop policy if exists "horses_delete_own"  on horses;

alter table horses disable row level security;

-- --------------------------------------------------------------------------
-- health_events
-- --------------------------------------------------------------------------

drop policy if exists "health_events_select_own"  on health_events;
drop policy if exists "health_events_select_anon" on health_events;
drop policy if exists "health_events_insert_own"  on health_events;
drop policy if exists "health_events_update_own"  on health_events;
drop policy if exists "health_events_delete_own"  on health_events;

alter table health_events disable row level security;

-- --------------------------------------------------------------------------
-- daily_logs
-- --------------------------------------------------------------------------

drop policy if exists "daily_logs_select_own"  on daily_logs;
drop policy if exists "daily_logs_select_anon" on daily_logs;
drop policy if exists "daily_logs_insert_own"  on daily_logs;
drop policy if exists "daily_logs_update_own"  on daily_logs;
drop policy if exists "daily_logs_delete_own"  on daily_logs;

alter table daily_logs disable row level security;
