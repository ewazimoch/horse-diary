-- ============================================================================
-- migration: 20260416120000_initial_schema
-- purpose:   create the complete initial database schema for horse diary app
-- tables:    profiles, horses, health_events, daily_logs
-- enums:     health_event_type, activity_type
-- includes:  rls policies, indexes, triggers, helper functions
-- notes:     auth.users is managed by supabase auth and is not created here.
--            profiles are auto-created via trigger on user registration.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. custom enum types
-- --------------------------------------------------------------------------

-- health event categories used in the health module (moduł zdrowie)
create type health_event_type as enum (
  'farrier',      -- kowal
  'vet',          -- weterynarz
  'vaccination',  -- szczepienie
  'deworming',    -- odrobaczanie
  'dentist'       -- dentysta
);

-- activity categories for the daily log module (moduł dzień)
create type activity_type as enum (
  'longing',      -- lonżowanie
  'riding',       -- jazda na placu
  'groundwork',   -- praca z ziemi
  'walk',         -- spacer
  'care',         -- pielęgnacja
  'trail',        -- wyjazd w teren
  'other'         -- inne
);

-- --------------------------------------------------------------------------
-- 2. tables
-- --------------------------------------------------------------------------

-- profiles: 1:1 extension of auth.users for app-specific user data.
-- created automatically by a trigger when a new user registers.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- horses: core domain entity. one user can own many horses.
create table horses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  name        varchar(100) not null,
  birth_year  smallint,
  breed       varchar(100),
  color       varchar(50),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- health_events: medical / care events linked to a horse (health module).
-- cascade: deleting a horse removes all its health events automatically.
create table health_events (
  id           uuid primary key default gen_random_uuid(),
  horse_id     uuid not null references horses(id) on delete cascade,
  event_type   health_event_type not null,
  event_date   date not null,
  notes        text,
  ai_metadata  jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- daily_logs: daily journal entries for a horse (day module).
-- unique constraint ensures at most one log per horse per day,
-- which also enables upsert logic for offline/pwa sync.
-- cascade: deleting a horse removes all its daily logs automatically.
create table daily_logs (
  id           uuid primary key default gen_random_uuid(),
  horse_id     uuid not null references horses(id) on delete cascade,
  log_date     date not null,
  mood_score   smallint not null check (mood_score between 1 and 3),
  activities   activity_type[] not null check (array_length(activities, 1) >= 1),
  notes        text,
  ai_metadata  jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint uq_daily_logs_horse_date unique (horse_id, log_date)
);

-- --------------------------------------------------------------------------
-- 3. indexes
-- --------------------------------------------------------------------------

-- fast lookup of horses belonging to a user (profile switcher dropdown)
create index idx_horses_user_id on horses(user_id);

-- timeline view: range queries for a horse's health events within a date window
create index idx_health_events_horse_date on health_events(horse_id, event_date);

-- aggregate views: filter health events by type (e.g. all farrier visits)
create index idx_health_events_type on health_events(event_type);

-- note: daily_logs already gets an implicit index from the unique constraint
-- uq_daily_logs_horse_date on (horse_id, log_date), which covers timeline queries.

-- --------------------------------------------------------------------------
-- 4. row level security (rls)
-- --------------------------------------------------------------------------

alter table profiles enable row level security;
alter table horses enable row level security;
alter table health_events enable row level security;
alter table daily_logs enable row level security;

-- 4.1 profiles policies
-- users can only read their own profile row (matched by auth.uid())
create policy "profiles_select_own"
  on profiles for select
  to authenticated
  using (id = auth.uid());

-- anon users have no access to profiles
create policy "profiles_select_anon"
  on profiles for select
  to anon
  using (false);

-- users can update only their own profile
create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- profile insertion is handled exclusively by the trigger function
-- (security definer), so no insert policy is needed for authenticated/anon.

-- 4.2 horses policies
-- users can read only their own horses
create policy "horses_select_own"
  on horses for select
  to authenticated
  using (user_id = auth.uid());

-- anon users have no access to horses
create policy "horses_select_anon"
  on horses for select
  to anon
  using (false);

-- users can only create horses assigned to themselves
create policy "horses_insert_own"
  on horses for insert
  to authenticated
  with check (user_id = auth.uid());

-- users can only update their own horses
create policy "horses_update_own"
  on horses for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- users can only delete their own horses
create policy "horses_delete_own"
  on horses for delete
  to authenticated
  using (user_id = auth.uid());

-- 4.3 health_events policies
-- ownership is verified by joining through horses table to check user_id.

-- users can read health events only for their own horses
create policy "health_events_select_own"
  on health_events for select
  to authenticated
  using (
    exists (
      select 1 from horses
      where horses.id = health_events.horse_id
        and horses.user_id = auth.uid()
    )
  );

-- anon users have no access to health events
create policy "health_events_select_anon"
  on health_events for select
  to anon
  using (false);

-- users can create health events only for their own horses
create policy "health_events_insert_own"
  on health_events for insert
  to authenticated
  with check (
    exists (
      select 1 from horses
      where horses.id = health_events.horse_id
        and horses.user_id = auth.uid()
    )
  );

-- users can update health events only for their own horses
create policy "health_events_update_own"
  on health_events for update
  to authenticated
  using (
    exists (
      select 1 from horses
      where horses.id = health_events.horse_id
        and horses.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from horses
      where horses.id = health_events.horse_id
        and horses.user_id = auth.uid()
    )
  );

-- users can delete health events only for their own horses
create policy "health_events_delete_own"
  on health_events for delete
  to authenticated
  using (
    exists (
      select 1 from horses
      where horses.id = health_events.horse_id
        and horses.user_id = auth.uid()
    )
  );

-- 4.4 daily_logs policies
-- ownership is verified by joining through horses table to check user_id.

-- users can read daily logs only for their own horses
create policy "daily_logs_select_own"
  on daily_logs for select
  to authenticated
  using (
    exists (
      select 1 from horses
      where horses.id = daily_logs.horse_id
        and horses.user_id = auth.uid()
    )
  );

-- anon users have no access to daily logs
create policy "daily_logs_select_anon"
  on daily_logs for select
  to anon
  using (false);

-- users can create daily logs only for their own horses
create policy "daily_logs_insert_own"
  on daily_logs for insert
  to authenticated
  with check (
    exists (
      select 1 from horses
      where horses.id = daily_logs.horse_id
        and horses.user_id = auth.uid()
    )
  );

-- users can update daily logs only for their own horses
create policy "daily_logs_update_own"
  on daily_logs for update
  to authenticated
  using (
    exists (
      select 1 from horses
      where horses.id = daily_logs.horse_id
        and horses.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from horses
      where horses.id = daily_logs.horse_id
        and horses.user_id = auth.uid()
    )
  );

-- users can delete daily logs only for their own horses
create policy "daily_logs_delete_own"
  on daily_logs for delete
  to authenticated
  using (
    exists (
      select 1 from horses
      where horses.id = daily_logs.horse_id
        and horses.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- 5. helper functions & triggers
-- --------------------------------------------------------------------------

-- 5.1 auto-create profile on user registration
-- runs as security definer to bypass rls when inserting into profiles
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- 5.2 auto-update updated_at timestamp on row modification
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger set_horses_updated_at
  before update on horses
  for each row execute function update_updated_at();

create trigger set_health_events_updated_at
  before update on health_events
  for each row execute function update_updated_at();

create trigger set_daily_logs_updated_at
  before update on daily_logs
  for each row execute function update_updated_at();
