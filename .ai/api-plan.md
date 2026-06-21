# REST API Plan — Horse Diary

## 1. Resources

| Resource | Table | Description |
|---|---|---|
| **Auth** | `auth.users` (Supabase managed) | Registration, login, logout |
| **Horses** | `horses` | Horse profiles owned by the authenticated user |
| **Health Events** | `health_events` | Medical and care events linked to a horse |
| **Daily Logs** | `daily_logs` | Daily activity and mood logs linked to a horse (one per horse per day) |
| **Timeline** | virtual (`health_events` + `daily_logs`) | Unified weekly view combining both modules |

---

## 2. Endpoints

### 2.1 Authentication

Authentication is delegated to Supabase Auth. The three API routes act as thin proxies that translate form submissions into Supabase SDK calls and manage cookie-based sessions via `@supabase/ssr`.

---

#### `POST /api/auth/signup`

Register a new user account.

**Request body**

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Success response** `201 Created`

```json
{ "message": "Account created. Check your email to confirm registration." }
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Missing or invalid fields |
| `409 Conflict` | Email already registered |
| `422 Unprocessable Entity` | Password too short (< 6 chars) |

---

#### `POST /api/auth/signin`

Log in with email and password. Sets a session cookie on success.

**Request body**

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Success response** `200 OK`

```json
{ "message": "Signed in successfully." }
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Missing fields |
| `401 Unauthorized` | Invalid credentials |

---

#### `POST /api/auth/signout`

Invalidate the current session and clear the session cookie.

**Success response** `200 OK`

```json
{ "message": "Signed out." }
```

---

### 2.2 Horses

All endpoints in this group require an authenticated session. Users can only access their own horses (enforced by RLS on `horses.user_id = auth.uid()`).

---

#### `GET /api/horses`

List all horse profiles belonging to the authenticated user. Used to populate the profile-switcher Select component in the navigation bar.

**Query parameters** — none (all horses are returned; volume is inherently small per user)

**Success response** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Burek",
      "birth_year": 2015,
      "breed": "Arabian",
      "color": "Bay",
      "created_at": "2026-04-16T12:00:00Z",
      "updated_at": "2026-04-16T12:00:00Z"
    }
  ],
  "count": 1
}
```

**Error responses**

| Status | Condition |
|---|---|
| `401 Unauthorized` | No valid session |

---

#### `POST /api/horses`

Create a new horse profile. Used both during the first-time onboarding flow (US-002) and when adding subsequent horses.

**Request body**

```json
{
  "name": "Burek",
  "birth_year": 2015,
  "breed": "Arabian",
  "color": "Bay"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `name` | string | yes | max 100 chars |
| `birth_year` | integer | no | 4-digit year, ≤ current year |
| `breed` | string | no | max 100 chars |
| `color` | string | no | max 50 chars |

**Success response** `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "name": "Burek",
    "birth_year": 2015,
    "breed": "Arabian",
    "color": "Bay",
    "created_at": "2026-06-21T10:00:00Z",
    "updated_at": "2026-06-21T10:00:00Z"
  }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Validation failure (missing name, value out of range, etc.) |
| `401 Unauthorized` | No valid session |

---

#### `GET /api/horses/:id`

Retrieve a single horse profile.

**Success response** `200 OK`

```json
{
  "data": {
    "id": "uuid",
    "name": "Burek",
    "birth_year": 2015,
    "breed": "Arabian",
    "color": "Bay",
    "created_at": "2026-04-16T12:00:00Z",
    "updated_at": "2026-04-16T12:00:00Z"
  }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Horse not found or does not belong to the user |

---

#### `PATCH /api/horses/:id`

Update a horse profile. Only provided fields are updated.

**Request body** (all fields optional)

```json
{
  "name": "Burek II",
  "birth_year": 2016,
  "breed": "Warmblood",
  "color": "Chestnut"
}
```

**Success response** `200 OK`

```json
{
  "data": { "id": "uuid", "name": "Burek II", "..." }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Validation failure |
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Horse not found or not owned by user |

---

#### `DELETE /api/horses/:id`

Delete a horse profile. Cascades to all linked `health_events` and `daily_logs`.

**Success response** `204 No Content`

**Error responses**

| Status | Condition |
|---|---|
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Horse not found or not owned by user |

---

### 2.3 Health Events

Scoped under a horse. RLS verifies horse ownership via a sub-query on `horses.user_id = auth.uid()`.

---

#### `GET /api/horses/:horseId/health-events`

List health events for a horse. Supports filtering by type and date range, enabling both the aggregated history view (US-009) and timeline data fetching.

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `type` | `health_event_type` | — | Filter by event type (`farrier`, `vet`, `vaccination`, `deworming`, `dentist`) |
| `date_from` | `YYYY-MM-DD` | — | Inclusive lower bound on `event_date` |
| `date_to` | `YYYY-MM-DD` | — | Inclusive upper bound on `event_date` |
| `sort` | `date_asc` \| `date_desc` | `date_desc` | Sort direction |
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Results per page (max `100`) |

**Success response** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "horse_id": "uuid",
      "event_type": "farrier",
      "event_date": "2026-06-21",
      "notes": "Left front hoof trimmed.",
      "created_at": "2026-06-21T10:00:00Z",
      "updated_at": "2026-06-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Invalid query parameter value |
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Horse not found or not owned by user |

---

#### `POST /api/horses/:horseId/health-events`

Create a new health event for a horse (US-005). The `event_date` can be in the past or future to support scheduling upcoming visits.

**Request body**

```json
{
  "event_type": "farrier",
  "event_date": "2026-06-21",
  "notes": "Left front hoof trimmed."
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `event_type` | string | yes | one of: `farrier`, `vet`, `vaccination`, `deworming`, `dentist` |
| `event_date` | `YYYY-MM-DD` | yes | valid date, past or future |
| `notes` | string | no | free text, max 2000 chars |

**Success response** `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "horse_id": "uuid",
    "event_type": "farrier",
    "event_date": "2026-06-21",
    "notes": "Left front hoof trimmed.",
    "created_at": "2026-06-21T10:00:00Z",
    "updated_at": "2026-06-21T10:00:00Z"
  }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Missing required fields or invalid `event_type` value |
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Horse not found or not owned by user |

---

#### `GET /api/horses/:horseId/health-events/:id`

Retrieve a single health event.

**Success response** `200 OK`

```json
{
  "data": {
    "id": "uuid",
    "horse_id": "uuid",
    "event_type": "vet",
    "event_date": "2026-05-10",
    "notes": "Annual check-up.",
    "created_at": "2026-05-10T09:00:00Z",
    "updated_at": "2026-05-10T09:00:00Z"
  }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Event not found or not accessible |

---

#### `PATCH /api/horses/:horseId/health-events/:id`

Update a health event (US-008). Only provided fields are modified.

**Request body** (all fields optional)

```json
{
  "event_type": "vet",
  "event_date": "2026-07-01",
  "notes": "Updated note."
}
```

**Success response** `200 OK`

```json
{
  "data": { "id": "uuid", "event_type": "vet", "..." }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Validation failure |
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Event not found or not accessible |

---

#### `DELETE /api/horses/:horseId/health-events/:id`

Delete a health event (US-008).

**Success response** `204 No Content`

**Error responses**

| Status | Condition |
|---|---|
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Event not found or not accessible |

---

#### `POST /api/horses/:horseId/health-events/sync`

Bulk upsert health events queued offline in IndexedDB (US-007). Processed in a single database transaction. Health events do not have a natural unique conflict key beyond `id`, so entries with a client-generated `id` are upserted on `id`; entries without an `id` are inserted as new records.

**Request body**

```json
{
  "entries": [
    {
      "id": "client-generated-uuid-or-omit",
      "event_type": "farrier",
      "event_date": "2026-06-20",
      "notes": "Offline entry."
    }
  ]
}
```

**Success response** `200 OK`

```json
{
  "synced": 2,
  "failed": 0,
  "errors": []
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | `entries` is empty or any entry fails validation |
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Horse not found or not owned by user |

---

### 2.4 Daily Logs

Scoped under a horse. Enforces one log per horse per day via `UNIQUE(horse_id, log_date)`.

---

#### `GET /api/horses/:horseId/daily-logs`

List daily logs for a horse. Supports date range filtering for timeline and calendar views.

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `date_from` | `YYYY-MM-DD` | — | Inclusive lower bound on `log_date` |
| `date_to` | `YYYY-MM-DD` | — | Inclusive upper bound on `log_date` |
| `sort` | `date_asc` \| `date_desc` | `date_desc` | Sort direction |
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Results per page (max `100`) |

**Success response** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "horse_id": "uuid",
      "log_date": "2026-06-21",
      "mood_score": 3,
      "activities": ["riding", "walk"],
      "notes": "Great session today.",
      "created_at": "2026-06-21T18:00:00Z",
      "updated_at": "2026-06-21T18:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 87
  }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Invalid query parameter value |
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Horse not found or not owned by user |

---

#### `POST /api/horses/:horseId/daily-logs`

Create or update the daily log for a specific date (US-004). Uses `INSERT ... ON CONFLICT (horse_id, log_date) DO UPDATE` to enforce the one-log-per-day constraint while supporting idempotent offline sync.

**Request body**

```json
{
  "log_date": "2026-06-21",
  "mood_score": 3,
  "activities": ["riding", "walk"],
  "notes": "Great session today."
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `log_date` | `YYYY-MM-DD` | yes | valid date |
| `mood_score` | integer | yes | `1`, `2`, or `3` |
| `activities` | string[] | yes | min 1 element; each value must be one of: `longing`, `riding`, `groundwork`, `walk`, `care`, `trail`, `other` |
| `notes` | string | no | free text, max 2000 chars |

**Success response** `200 OK` (upsert — whether created or updated)

```json
{
  "data": {
    "id": "uuid",
    "horse_id": "uuid",
    "log_date": "2026-06-21",
    "mood_score": 3,
    "activities": ["riding", "walk"],
    "notes": "Great session today.",
    "created_at": "2026-06-21T18:00:00Z",
    "updated_at": "2026-06-21T18:00:00Z"
  }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Missing required fields, `mood_score` out of range, empty `activities` array, or unknown activity value |
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Horse not found or not owned by user |

---

#### `GET /api/horses/:horseId/daily-logs/:id`

Retrieve a single daily log by its UUID.

**Success response** `200 OK`

```json
{
  "data": {
    "id": "uuid",
    "horse_id": "uuid",
    "log_date": "2026-06-21",
    "mood_score": 2,
    "activities": ["groundwork"],
    "notes": null,
    "created_at": "2026-06-21T08:00:00Z",
    "updated_at": "2026-06-21T08:00:00Z"
  }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Log not found or not accessible |

---

#### `PATCH /api/horses/:horseId/daily-logs/:id`

Update an existing daily log (US-008). Only provided fields are modified.

**Request body** (all fields optional)

```json
{
  "mood_score": 1,
  "activities": ["care"],
  "notes": "Horse was tired."
}
```

**Success response** `200 OK`

```json
{
  "data": { "id": "uuid", "mood_score": 1, "..." }
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | Validation failure |
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Log not found or not accessible |

---

#### `DELETE /api/horses/:horseId/daily-logs/:id`

Delete a daily log (US-008).

**Success response** `204 No Content`

**Error responses**

| Status | Condition |
|---|---|
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Log not found or not accessible |

---

#### `POST /api/horses/:horseId/daily-logs/sync`

Bulk upsert daily logs queued offline in IndexedDB (US-007). Uses `INSERT ... ON CONFLICT (horse_id, log_date) DO UPDATE` for each entry, ensuring idempotency. Processed in a single transaction.

**Request body**

```json
{
  "entries": [
    {
      "log_date": "2026-06-19",
      "mood_score": 2,
      "activities": ["walk"],
      "notes": "Short walk."
    },
    {
      "log_date": "2026-06-20",
      "mood_score": 3,
      "activities": ["riding", "care"],
      "notes": null
    }
  ]
}
```

**Success response** `200 OK`

```json
{
  "synced": 2,
  "failed": 0,
  "errors": []
}
```

If some entries fail validation, the valid entries are still synced and failures are reported:

```json
{
  "synced": 1,
  "failed": 1,
  "errors": [
    { "log_date": "2026-06-20", "message": "mood_score must be between 1 and 3" }
  ]
}
```

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | `entries` array is missing or empty |
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Horse not found or not owned by user |

---

### 2.5 Timeline

Virtual resource that merges health events and daily logs for a 7-day window (Monday–Sunday), as described in US-006.

---

#### `GET /api/horses/:horseId/timeline`

Return a unified weekly timeline. Defaults to the current ISO week (Monday–Sunday). Health events appear before the daily log within each day's data, as required by the PRD.

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `week_start` | `YYYY-MM-DD` | Current week's Monday | The Monday that starts the 7-day window |

**Success response** `200 OK`

```json
{
  "week_start": "2026-06-16",
  "week_end": "2026-06-22",
  "days": [
    {
      "date": "2026-06-16",
      "day_of_week": "Monday",
      "health_events": [
        {
          "id": "uuid",
          "event_type": "farrier",
          "event_date": "2026-06-16",
          "notes": "Scheduled trim.",
          "is_future": false,
          "created_at": "2026-06-10T08:00:00Z",
          "updated_at": "2026-06-10T08:00:00Z"
        }
      ],
      "daily_log": {
        "id": "uuid",
        "log_date": "2026-06-16",
        "mood_score": 3,
        "activities": ["riding"],
        "notes": null,
        "created_at": "2026-06-16T19:00:00Z",
        "updated_at": "2026-06-16T19:00:00Z"
      }
    },
    {
      "date": "2026-06-17",
      "day_of_week": "Tuesday",
      "health_events": [],
      "daily_log": null
    }
  ]
}
```

> `is_future` is `true` when `event_date` is strictly after the server's current date; this flag drives the visual distinction between planned and completed events (US-006).

**Error responses**

| Status | Condition |
|---|---|
| `400 Bad Request` | `week_start` is not a Monday or is an invalid date |
| `401 Unauthorized` | No valid session |
| `404 Not Found` | Horse not found or not owned by user |

---

## 3. Authentication and Authorization

### Mechanism

The app uses **cookie-based sessions** managed by Supabase SSR (`@supabase/ssr`). On each request, the Astro middleware (`src/middleware/index.ts`) reads the session from the request cookies, validates it with the Supabase client, and attaches the resolved user to `context.locals.user`.

### Enforcement layers

1. **Middleware (route guard)**: Routes listed in `PROTECTED_ROUTES` redirect unauthenticated requests to `/auth/signin`. All `/api/*` routes outside of `/api/auth/*` return `401 Unauthorized` when `context.locals.user` is absent.

2. **Application layer (ownership check)**: Before performing any operation on a nested resource (health events, daily logs), the API handler explicitly verifies that the `:horseId` path parameter belongs to the authenticated user. This catches cases where RLS is the last line of defence.

3. **Database layer (Row Level Security)**: RLS policies on all four tables ensure that even a buggy or compromised API handler cannot read or mutate another user's data. All queries are executed with the authenticated user's JWT, so Supabase enforces `user_id = auth.uid()` at the database level.

### Session lifecycle

| Action | Outcome |
|---|---|
| `POST /api/auth/signup` | Supabase sends a confirmation email; no session until email confirmed |
| `POST /api/auth/signin` | Session cookie set (`HttpOnly`, `Secure`, `SameSite=Lax`) |
| `POST /api/auth/signout` | Session cookie cleared, Supabase session invalidated |
| Session expiry | Supabase SSR client refreshes the token automatically using the refresh-token cookie |

---

## 4. Validation and Business Logic

### 4.1 Validation rules per resource

#### Horses

| Field | Rule |
|---|---|
| `name` | Required. String. Max 100 characters. |
| `birth_year` | Optional. Integer. 4-digit year. Must be ≤ current year. |
| `breed` | Optional. String. Max 100 characters. |
| `color` | Optional. String. Max 50 characters. |

#### Health Events

| Field | Rule |
|---|---|
| `event_type` | Required. Must be one of: `farrier`, `vet`, `vaccination`, `deworming`, `dentist`. |
| `event_date` | Required. ISO date (`YYYY-MM-DD`). Past or future dates both accepted. |
| `notes` | Optional. String. Max 2000 characters. |

#### Daily Logs

| Field | Rule |
|---|---|
| `log_date` | Required. ISO date (`YYYY-MM-DD`). |
| `mood_score` | Required. Integer. Must be exactly `1`, `2`, or `3`. |
| `activities` | Required. Array of strings. Minimum 1 element. Each element must be one of: `longing`, `riding`, `groundwork`, `walk`, `care`, `trail`, `other`. |
| `notes` | Optional. String. Max 2000 characters. |

All input is validated with **Zod schemas** before any database interaction, returning a structured `400 Bad Request` with field-level error details on failure.

### 4.2 Business logic implementation

#### One daily log per horse per day
`POST /api/horses/:horseId/daily-logs` always performs an upsert: `INSERT INTO daily_logs (...) ON CONFLICT (horse_id, log_date) DO UPDATE SET ...`. This rule is also enforced at the database level by the `UNIQUE(horse_id, log_date)` constraint.

#### Timeline ordering
The `GET /api/horses/:horseId/timeline` endpoint queries health events and daily logs for the 7-day window in a single round trip and assembles the response server-side. Within each day, health events are placed before the daily log entry, matching the priority order specified in the PRD.

#### Past vs. future health events
Each health event in the timeline response includes an `is_future` boolean field computed as `event_date > CURRENT_DATE`. Frontend components use this flag to render planned events with a distinct visual style (e.g. dashed border or muted colour) without additional client-side date logic.

#### Offline sync (PWA / IndexedDB queue)
When connectivity is restored, the React island responsible for offline queuing calls the bulk sync endpoints (`POST /api/horses/:horseId/daily-logs/sync` and `POST /api/horses/:horseId/health-events/sync`) in sequence. Each endpoint processes its entries in a single database transaction and returns a summary object (`synced`, `failed`, `errors`). The calling component displays a Toast notification on success (US-007).

#### Onboarding flow
After successful registration and email confirmation, the app checks whether the authenticated user has any horses (`GET /api/horses`). If the response returns an empty array, the frontend renders the one-time onboarding screen that calls `POST /api/horses` with just a `name` (US-002).

#### Ownership verification
For nested routes (`/api/horses/:horseId/...`) the handler performs an explicit ownership check before the main query:

```typescript
const { data: horse } = await supabase
  .from("horses")
  .select("id")
  .eq("id", horseId)
  .single();

if (!horse) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
```

Because RLS is active, this query returns nothing if the horse belongs to another user, making the 404 response safe to return without leaking the existence of the record.

#### Hard delete
All delete operations use SQL `DELETE`. There is no soft-delete or archive mechanism in the MVP, consistent with the database design decision documented in `db-plan.md` §5.3.

#### `ai_metadata` field
The `ai_metadata` JSONB column on `health_events` and `daily_logs` is never exposed in request bodies for MVP endpoints. It is intentionally excluded from API write schemas to prevent arbitrary client-side writes. The field may be returned in read responses as `null` until AI integration is implemented.
