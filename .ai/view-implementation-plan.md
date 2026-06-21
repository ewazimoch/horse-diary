# API Endpoint Implementation Plan: Horse Diary REST API

## 1. Przegląd punktów końcowych

Plan obejmuje pełne wdrożenie wszystkich endpointów REST API aplikacji **Horse Diary**. Zasoby pogrupowane są w pięć obszarów:

| Grupa | Ścieżka bazowa | Opis |
|---|---|---|
| Auth | `/api/auth/*` | Rejestracja, logowanie i wylogowanie przez Supabase Auth |
| Horses | `/api/horses` | Zarządzanie profilami koni użytkownika |
| Health Events | `/api/horses/:horseId/health-events` | Zdarzenia medyczne/pielęgnacyjne konia |
| Daily Logs | `/api/horses/:horseId/daily-logs` | Dzienne wpisy aktywności i nastroju konia |
| Timeline | `/api/horses/:horseId/timeline` | Wirtualny zasób — unified 7-dniowy widok tygodniowy |

Wszystkie endpointy z wyjątkiem `/api/auth/*` wymagają aktywnej sesji. Uwierzytelnianie opiera się na cookie-based sessions zarządzanych przez `@supabase/ssr`.

---

## 2. Szczegóły żądań

### 2.1 Auth

#### `POST /api/auth/signup`
- **Body**: `{ email: string, password: string }`
- **Walidacja**: email format, password min 6 znaków

#### `POST /api/auth/signin`
- **Body**: `{ email: string, password: string }`
- **Walidacja**: oba pola wymagane

#### `POST /api/auth/signout`
- Brak body — wystarczy aktywna sesja (cookie)

---

### 2.2 Horses

#### `GET /api/horses`
- Brak query parametrów (pełna lista bez paginacji)

#### `POST /api/horses`
- **Body**:

| Pole | Typ | Wymagane | Ograniczenia |
|---|---|---|---|
| `name` | `string` | tak | max 100 znaków |
| `birth_year` | `integer` | nie | 4-cyfrowy rok, ≤ aktualny rok |
| `breed` | `string` | nie | max 100 znaków |
| `color` | `string` | nie | max 50 znaków |

#### `GET /api/horses/:id`
- **Path param**: `id` — UUID konia

#### `PATCH /api/horses/:id`
- **Path param**: `id` — UUID konia
- **Body**: Wszystkie pola jak w POST, ale wszystkie opcjonalne

#### `DELETE /api/horses/:id`
- **Path param**: `id` — UUID konia

---

### 2.3 Health Events

#### `GET /api/horses/:horseId/health-events`
- **Path param**: `horseId` — UUID konia
- **Query params**:

| Parametr | Typ | Domyślny | Opis |
|---|---|---|---|
| `type` | `health_event_type` enum | — | filtr po typie zdarzenia |
| `date_from` | `YYYY-MM-DD` | — | dolna granica `event_date` (włącznie) |
| `date_to` | `YYYY-MM-DD` | — | górna granica `event_date` (włącznie) |
| `sort` | `date_asc` \| `date_desc` | `date_desc` | kierunek sortowania |
| `page` | `integer` | `1` | numer strony |
| `limit` | `integer` | `20` | wyniki na stronę (max `100`) |

#### `POST /api/horses/:horseId/health-events`
- **Body**:

| Pole | Typ | Wymagane | Ograniczenia |
|---|---|---|---|
| `event_type` | `health_event_type` | tak | enum: `farrier`, `vet`, `vaccination`, `deworming`, `dentist` |
| `event_date` | `YYYY-MM-DD` | tak | poprawna data, przeszła lub przyszła |
| `notes` | `string` | nie | max 2000 znaków |

#### `GET /api/horses/:horseId/health-events/:id`
- **Path params**: `horseId`, `id` — oba UUID

#### `PATCH /api/horses/:horseId/health-events/:id`
- **Body**: Wszystkie pola jak w POST, wszystkie opcjonalne

#### `DELETE /api/horses/:horseId/health-events/:id`
- **Path params**: `horseId`, `id`

#### `POST /api/horses/:horseId/health-events/sync`
- **Body**:

```json
{
  "entries": [
    {
      "id": "opcjonalny-client-uuid",
      "event_type": "farrier",
      "event_date": "2026-06-20",
      "notes": "Offline entry."
    }
  ]
}
```

Wpisy z `id` są upsertowane na podstawie `id`; wpisy bez `id` są wstawiane jako nowe rekordy.

---

### 2.4 Daily Logs

#### `GET /api/horses/:horseId/daily-logs`
- **Path param**: `horseId` — UUID konia
- **Query params**:

| Parametr | Typ | Domyślny | Opis |
|---|---|---|---|
| `date_from` | `YYYY-MM-DD` | — | dolna granica `log_date` (włącznie) |
| `date_to` | `YYYY-MM-DD` | — | górna granica `log_date` (włącznie) |
| `sort` | `date_asc` \| `date_desc` | `date_desc` | kierunek sortowania |
| `page` | `integer` | `1` | numer strony |
| `limit` | `integer` | `20` | wyniki na stronę (max `100`) |

#### `POST /api/horses/:horseId/daily-logs` (upsert)
- **Body**:

| Pole | Typ | Wymagane | Ograniczenia |
|---|---|---|---|
| `log_date` | `YYYY-MM-DD` | tak | poprawna data |
| `mood_score` | `integer` | tak | dokładnie `1`, `2` lub `3` |
| `activities` | `string[]` | tak | min 1 element; enum: `longing`, `riding`, `groundwork`, `walk`, `care`, `trail`, `other` |
| `notes` | `string` | nie | max 2000 znaków |

Operacja zawsze wykonuje upsert: `INSERT ... ON CONFLICT (horse_id, log_date) DO UPDATE`.

#### `GET /api/horses/:horseId/daily-logs/:id`
#### `PATCH /api/horses/:horseId/daily-logs/:id`
- **Body**: `mood_score`, `activities`, `notes` — wszystkie opcjonalne. Uwaga: `log_date` jest celowo wykluczony z PATCH (jest kluczem konfliktu i nie może być zmieniony po utworzeniu).

#### `DELETE /api/horses/:horseId/daily-logs/:id`

#### `POST /api/horses/:horseId/daily-logs/sync`
- **Body**: `{ "entries": UpsertDailyLogCommand[] }` — min 1 element
- Partial success: wpisy, które przejdą walidację, są synchronizowane; błędne są raportowane w `errors[]`.

---

### 2.5 Timeline

#### `GET /api/horses/:horseId/timeline`
- **Path param**: `horseId` — UUID konia
- **Query params**:

| Parametr | Typ | Domyślny | Opis |
|---|---|---|---|
| `week_start` | `YYYY-MM-DD` | Poniedziałek bieżącego tygodnia | Poniedziałek rozpoczynający 7-dniowe okno |

Walidacja: `week_start` musi być poniedziałkiem (dzień tygodnia = 1 w ISO).

---

## 3. Wykorzystywane typy

Wszystkie typy zdefiniowane w `src/types.ts`. Ich użycie w endpointach:

### Typy skalarne
```typescript
// src/types.ts
export type ActivityType = Enums<"activity_type">;
// "longing" | "riding" | "groundwork" | "walk" | "care" | "trail" | "other"

export type HealthEventType = Enums<"health_event_type">;
// "farrier" | "vet" | "vaccination" | "deworming" | "dentist"

export type MoodScore = 1 | 2 | 3;
export type SortDirection = "date_asc" | "date_desc";
```

### Auth
```typescript
SignUpCommand        // POST /api/auth/signup body
SignInCommand        // POST /api/auth/signin body
AuthMessageDTO       // odpowiedź auth endpoints
```

### Horses
```typescript
CreateHorseCommand   // POST /api/horses body
UpdateHorseCommand   // PATCH /api/horses/:id body
HorseDTO             // pojedynczy obiekt w odpowiedzi (user_id wykluczone)
HorseListDTO         // GET /api/horses odpowiedź { data, count }
HorseDetailDTO       // GET/POST/PATCH /api/horses/:id odpowiedź { data }
```

### Health Events
```typescript
CreateHealthEventCommand    // POST body
UpdateHealthEventCommand    // PATCH body (wszystkie pola Partial)
SyncHealthEventEntry        // element entries w sync
SyncHealthEventsCommand     // POST /sync body
HealthEventListQueryParams  // query parametry GET list
HealthEventDTO              // pojedynczy obiekt (ai_metadata wykluczone)
HealthEventListDTO          // GET list odpowiedź { data, pagination }
HealthEventDetailDTO        // GET/POST/PATCH /:id odpowiedź { data }
HealthEventSyncResultDTO    // POST /sync odpowiedź { synced, failed, errors }
HealthEventSyncErrorDTO     // element errors[] w sync result
```

### Daily Logs
```typescript
UpsertDailyLogCommand      // POST body (insert + conflict update)
UpdateDailyLogCommand      // PATCH body (log_date wykluczone)
SyncDailyLogsCommand       // POST /sync body
DailyLogListQueryParams    // query parametry GET list
DailyLogDTO                // pojedynczy obiekt (ai_metadata wykluczone, mood_score: MoodScore)
DailyLogListDTO            // GET list odpowiedź { data, pagination }
DailyLogDetailDTO          // GET/POST/PATCH /:id odpowiedź { data }
DailyLogSyncResultDTO      // POST /sync odpowiedź { synced, failed, errors }
DailyLogSyncErrorDTO       // element errors[] w sync result
```

### Timeline
```typescript
TimelineQueryParams        // query parametry GET timeline
TimelineHealthEventDTO     // health event w timeline (horse_id pominięty, is_future dodany)
TimelineDailyLogDTO        // daily log w timeline (horse_id pominięty)
TimelineDayDTO             // jeden dzień w timeline
TimelineDTO                // pełna odpowiedź GET /timeline
```

---

## 4. Szczegóły odpowiedzi

### 4.1 Auth

| Endpoint | Status sukcesu | Body sukcesu |
|---|---|---|
| POST /signup | `201 Created` | `{ message: "Account created. Check your email to confirm registration." }` |
| POST /signin | `200 OK` | `{ message: "Signed in successfully." }` |
| POST /signout | `200 OK` | `{ message: "Signed out." }` |

### 4.2 Horses

| Endpoint | Status sukcesu | Body sukcesu |
|---|---|---|
| GET /horses | `200 OK` | `HorseListDTO` — `{ data: HorseDTO[], count: number }` |
| POST /horses | `201 Created` | `HorseDetailDTO` — `{ data: HorseDTO }` |
| GET /horses/:id | `200 OK` | `HorseDetailDTO` |
| PATCH /horses/:id | `200 OK` | `HorseDetailDTO` |
| DELETE /horses/:id | `204 No Content` | brak body |

### 4.3 Health Events

| Endpoint | Status sukcesu | Body sukcesu |
|---|---|---|
| GET /health-events | `200 OK` | `HealthEventListDTO` — `{ data, pagination }` |
| POST /health-events | `201 Created` | `HealthEventDetailDTO` — `{ data: HealthEventDTO }` |
| GET /health-events/:id | `200 OK` | `HealthEventDetailDTO` |
| PATCH /health-events/:id | `200 OK` | `HealthEventDetailDTO` |
| DELETE /health-events/:id | `204 No Content` | brak body |
| POST /health-events/sync | `200 OK` | `HealthEventSyncResultDTO` — `{ synced, failed, errors }` |

### 4.4 Daily Logs

| Endpoint | Status sukcesu | Body sukcesu |
|---|---|---|
| GET /daily-logs | `200 OK` | `DailyLogListDTO` — `{ data, pagination }` |
| POST /daily-logs | `200 OK` | `DailyLogDetailDTO` — `{ data: DailyLogDTO }` |
| GET /daily-logs/:id | `200 OK` | `DailyLogDetailDTO` |
| PATCH /daily-logs/:id | `200 OK` | `DailyLogDetailDTO` |
| DELETE /daily-logs/:id | `204 No Content` | brak body |
| POST /daily-logs/sync | `200 OK` | `DailyLogSyncResultDTO` — `{ synced, failed, errors }` |

> Uwaga: `POST /daily-logs` zwraca `200 OK` (nie `201 Created`) ponieważ operacja jest upsert — może tworzyć nowy rekord lub aktualizować istniejący.

### 4.5 Timeline

| Endpoint | Status sukcesu | Body sukcesu |
|---|---|---|
| GET /timeline | `200 OK` | `TimelineDTO` — `{ week_start, week_end, days: TimelineDayDTO[7] }` |

Odpowiedź zawiera zawsze dokładnie 7 elementów w `days` (poniedziałek–niedziela). Dla dni bez zdarzeń: `health_events: []`, `daily_log: null`.

---

## 5. Przepływ danych

### 5.1 Architektura serwisów

```
API Route (src/pages/api/...)
  └── Zod validation
  └── Ownership check (dla nested routes)
  └── Service call (src/lib/services/...)
        └── Supabase query (context.locals.supabase)
  └── Response serialization
```

### 5.2 Tworzenie pliku serwisu na przykładzie `horses.service.ts`

```typescript
// src/lib/services/horses.service.ts
import type { SupabaseClient } from "@/db/supabase.client";
import type { CreateHorseCommand, UpdateHorseCommand, HorseDTO } from "@/types";

export async function listHorses(supabase: SupabaseClient): Promise<HorseDTO[]>
export async function createHorse(supabase: SupabaseClient, userId: string, cmd: CreateHorseCommand): Promise<HorseDTO>
export async function getHorse(supabase: SupabaseClient, id: string): Promise<HorseDTO | null>
export async function updateHorse(supabase: SupabaseClient, id: string, cmd: UpdateHorseCommand): Promise<HorseDTO | null>
export async function deleteHorse(supabase: SupabaseClient, id: string): Promise<boolean>
```

### 5.3 Timeline — przepływ danych

Timeline nie ma własnej tabeli. Serwis timeline wykonuje dwa równoległe zapytania:

```typescript
const [healthEventsResult, dailyLogsResult] = await Promise.all([
  supabase
    .from("health_events")
    .select("id, event_type, event_date, notes, created_at, updated_at")
    .eq("horse_id", horseId)
    .gte("event_date", weekStart)
    .lte("event_date", weekEnd),
  supabase
    .from("daily_logs")
    .select("id, log_date, mood_score, activities, notes, created_at, updated_at")
    .eq("horse_id", horseId)
    .gte("log_date", weekStart)
    .lte("log_date", weekEnd),
]);
```

Następnie serwis asembluje `TimelineDayDTO[]` server-side, obliczając `is_future = event_date > today` dla każdego health eventa.

### 5.4 Bulk Sync — przepływ danych

```
POST /sync body validation
  └── forEach entry: validate entry schema
        ├── jeśli invalid → push do errors[], kontynuuj
        └── jeśli valid → dodaj do batch
  └── wykonaj Supabase upsert dla batch w jednej transakcji
  └── zwróć { synced: batch.length, failed: errors.length, errors }
```

Health Events sync:
```typescript
await supabase.from("health_events").upsert(batch, { onConflict: "id" });
```

Daily Logs sync:
```typescript
await supabase.from("daily_logs").upsert(batch, { onConflict: "horse_id,log_date" });
```

### 5.5 Ownership verification

Dla wszystkich nested routes (`/api/horses/:horseId/...`) przed główną operacją:

```typescript
const { data: horse } = await supabase
  .from("horses")
  .select("id")
  .eq("id", horseId)
  .single();

if (!horse) {
  return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
}
```

RLS gwarantuje, że zapytanie nie zwróci nic dla cudzego konia — odpowiedź 404 nie ujawnia istnienia zasobu.

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie i sesja

- Cookie-based sessions zarządzane przez `@supabase/ssr`
- Sesja odczytywana przez middleware (`src/middleware/index.ts`) i attachowana do `context.locals.user`
- Token odświeżany automatycznie przez Supabase SSR client
- Cookie: `HttpOnly`, `Secure`, `SameSite=Lax`

### 6.2 Trójwarstwowa ochrona

1. **Middleware**: sprawdza `context.locals.user`; brak sesji → `401 Unauthorized` (wszystkie `/api/*` poza `/api/auth/*`)
2. **Application layer**: ownership check przez Supabase query filtrowane przez RLS przed każdą operacją na nested resource
3. **Database layer (RLS)**: polityki Supabase gwarantują, że użytkownik widzi i modyfikuje wyłącznie swoje dane, nawet przy obejściu warstwy aplikacji

### 6.3 Ograniczenia zapisu

- `ai_metadata` jest celowo wykluczone ze wszystkich schematów Zod dla operacji zapisu (POST/PATCH/sync)
- `user_id` nigdy nie jest przyjmowane z body — ustawiany z `context.locals.user.id`
- `horse_id` w nested routes pochodzi wyłącznie z path parametru, nie z body

### 6.4 Walidacja wejścia

- Wszystkie body żądań walidowane przez Zod przed jakimkolwiek dostępem do bazy
- Błędna walidacja → `400 Bad Request` z polem `error` zawierającym szczegóły field-level z `zod.flatten()`
- Query params rzutowane na odpowiednie typy (parseInt dla page/limit, string dla dat) przed walidacją

### 6.5 Zapobieganie nadpisaniu klucza konfliktu

- W `PATCH /daily-logs/:id`: `log_date` jest wykluczone z `UpdateDailyLogCommand` — nie można zmienić daty po utworzeniu wpisu
- W `POST /daily-logs`: upsert na `(horse_id, log_date)` jest idempotentny i bezpieczny dla offline sync

---

## 7. Obsługa błędów

### 7.1 Standardowy format błędu

Wszystkie błędy zwracane w formacie JSON:
```json
{ "error": "Opis błędu lub obiekt z field-level details" }
```

### 7.2 Kody statusu i warunki

| Kod | Opis | Warunki |
|---|---|---|
| `400 Bad Request` | Nieprawidłowe dane wejściowe | Błąd walidacji Zod, brak wymaganych pól, `mood_score` poza zakresem, pusta tablica `activities`, pusta tablica `entries` w sync, `week_start` nie jest poniedziałkiem |
| `401 Unauthorized` | Brak lub wygasła sesja | `context.locals.user` jest null, Supabase zwróci błąd auth |
| `404 Not Found` | Zasób nie znaleziony | Koń nie istnieje lub należy do innego użytkownika, health event / daily log nie znaleziony |
| `409 Conflict` | Konflikt danych | Email już zarejestrowany (tylko signup) |
| `422 Unprocessable Entity` | Błąd biznesowy | Hasło za krótkie (< 6 znaków, tylko signup) |
| `500 Internal Server Error` | Błąd serwera | Niespodziewany wyjątek, błąd Supabase inny niż auth/not found |

### 7.3 Obsługa błędów Supabase

```typescript
const { data, error } = await supabase.from("horses").select("*");

if (error) {
  console.error("[horses] Supabase error:", error);
  return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
}
```

Kody błędów Supabase mapowane na HTTP:
- `PGRST116` (no rows returned) → `404 Not Found`
- `23505` (unique violation) → `409 Conflict` (tylko tam gdzie nie jest to oczekiwane upsert)
- Inne → `500 Internal Server Error`

### 7.4 Partial success w sync

Endpointy `/sync` nie przerywają przetwarzania przy błędzie pojedynczego wpisu:
- Walidacja każdego wpisu oddzielnie
- Błędne wpisy lądują w `errors[]` z identyfikatorem (`id` lub `log_date`) i komunikatem
- Poprawne wpisy trafiają do upsert
- Zwraca `200 OK` nawet przy partial failure (błędy opisane w body)
- Zwraca `400 Bad Request` tylko gdy CAŁA tablica `entries` jest pusta lub brakująca

---

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazodanowe

Istniejące indeksy w schemacie pokrywają kluczowe wzorce zapytań:
- `idx_horses_user_id` — szybkie pobranie koni użytkownika
- `idx_health_events_horse_date` — zakresowe zapytania timeline i history
- `idx_health_events_type` — filtr po typie zdarzenia
- Implicit UNIQUE index na `(horse_id, log_date)` w `daily_logs` — pokrywa timeline i upsert

### 8.2 Timeline — równoległe zapytania

Endpoint timeline wykonuje dwa zapytania (`health_events` + `daily_logs`) równolegle przez `Promise.all()`, a nie sekwencyjnie. Minimalizuje to latencję odpowiedzi.

### 8.3 Paginacja

Listy health events i daily logs są domyślnie paginowane (20 wyników, max 100). Liczba całkowita (`total`) obliczana przez `{ count: "exact" }` w Supabase, co używa `COUNT(*)` w tym samym zapytaniu.

### 8.4 Brak paginacji dla Horses

Lista koni (`GET /api/horses`) zwraca wszystkie konie bez paginacji. Uzasadnienie: liczba koni per użytkownik jest inherentnie mała (rzędu kilku–kilkunastu), paginacja dodałaby złożoność bez realnej korzyści.

### 8.5 Selektywne kolumny

Zapytania Supabase używają selektywnego `select()` wykluczając `ai_metadata` (które może być dużym JSONB) z wszystkich odpowiedzi:
```typescript
supabase.from("health_events").select("id, horse_id, event_type, event_date, notes, created_at, updated_at")
```

---

## 9. Etapy wdrożenia

### Krok 1: Struktura plików

Utwórz następujące pliki:
```
src/
  lib/
    services/
      horses.service.ts
      health-events.service.ts
      daily-logs.service.ts
      timeline.service.ts
    validation/
      horses.schema.ts
      health-events.schema.ts
      daily-logs.schema.ts
  pages/
    api/
      horses/
        index.ts                          # GET /api/horses, POST /api/horses
        [id].ts                           # GET, PATCH, DELETE /api/horses/:id
        [horseId]/
          health-events/
            index.ts                      # GET list, POST create
            sync.ts                       # POST /sync
            [id].ts                       # GET, PATCH, DELETE /:id
          daily-logs/
            index.ts                      # GET list, POST upsert
            sync.ts                       # POST /sync
            [id].ts                       # GET, PATCH, DELETE /:id
          timeline.ts                     # GET /timeline
```

### Krok 2: Zod Schemas

Zdefiniuj schematy walidacji dla każdego zasobu. Przykład dla health events:

```typescript
// src/lib/validation/health-events.schema.ts
import { z } from "zod";

const HEALTH_EVENT_TYPES = ["farrier", "vet", "vaccination", "deworming", "dentist"] as const;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createHealthEventSchema = z.object({
  event_type: z.enum(HEALTH_EVENT_TYPES),
  event_date: z.string().regex(ISO_DATE_REGEX, "Date must be YYYY-MM-DD"),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateHealthEventSchema = createHealthEventSchema.partial();

export const syncHealthEventsSchema = z.object({
  entries: z.array(
    createHealthEventSchema.extend({
      id: z.string().uuid().optional(),
    })
  ).min(1, "entries must not be empty"),
});

export const healthEventListQuerySchema = z.object({
  type: z.enum(HEALTH_EVENT_TYPES).optional(),
  date_from: z.string().regex(ISO_DATE_REGEX).optional(),
  date_to: z.string().regex(ISO_DATE_REGEX).optional(),
  sort: z.enum(["date_asc", "date_desc"]).default("date_desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

### Krok 3: Serwisy

Implementuj serwisy dla każdego zasobu, odbierając `SupabaseClient` jako parametr (nie importując go globalnie). Przykład:

```typescript
// src/lib/services/health-events.service.ts
import type { SupabaseClient } from "@/db/supabase.client";
import type {
  CreateHealthEventCommand, UpdateHealthEventCommand,
  HealthEventDTO, HealthEventListDTO, HealthEventListQueryParams,
  SyncHealthEventsCommand, HealthEventSyncResultDTO,
} from "@/types";

export async function listHealthEvents(
  supabase: SupabaseClient,
  horseId: string,
  params: HealthEventListQueryParams
): Promise<HealthEventListDTO>

export async function createHealthEvent(
  supabase: SupabaseClient,
  horseId: string,
  cmd: CreateHealthEventCommand
): Promise<HealthEventDTO>

export async function getHealthEvent(
  supabase: SupabaseClient,
  horseId: string,
  id: string
): Promise<HealthEventDTO | null>

export async function updateHealthEvent(
  supabase: SupabaseClient,
  horseId: string,
  id: string,
  cmd: UpdateHealthEventCommand
): Promise<HealthEventDTO | null>

export async function deleteHealthEvent(
  supabase: SupabaseClient,
  horseId: string,
  id: string
): Promise<boolean>

export async function syncHealthEvents(
  supabase: SupabaseClient,
  horseId: string,
  cmd: SyncHealthEventsCommand
): Promise<HealthEventSyncResultDTO>
```

### Krok 4: Helper ownership check

Utwórz helper wielokrotnego użytku dla weryfikacji własności konia:

```typescript
// src/lib/services/horses.service.ts (dodaj do istniejącego)
export async function verifyHorseOwnership(
  supabase: SupabaseClient,
  horseId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("horses")
    .select("id")
    .eq("id", horseId)
    .single();
  return !!data;
}
```

### Krok 5: API Routes — szablon endpointu

Każdy endpoint Astro powinien:
1. Wyeksportować `export const prerender = false`
2. Zwalidować sesję (middleware robi to za nas, ale dla API routes sprawdź `context.locals.user`)
3. Zwalidować parametry Zod
4. Wywołać serwis
5. Zwrócić odpowiednią odpowiedź

```typescript
// src/pages/api/horses/[horseId]/health-events/index.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { createHealthEventSchema, healthEventListQuerySchema } from "@/lib/validation/health-events.schema";
import { createHealthEvent, listHealthEvents } from "@/lib/services/health-events.service";
import { verifyHorseOwnership } from "@/lib/services/horses.service";

export const GET: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { horseId } = params;
  const horseExists = await verifyHorseOwnership(locals.supabase, horseId!);
  if (!horseExists) {
    return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
  }

  const url = new URL(request.url);
  const queryResult = healthEventListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!queryResult.success) {
    return new Response(
      JSON.stringify({ error: queryResult.error.flatten() }),
      { status: 400 }
    );
  }

  const result = await listHealthEvents(locals.supabase, horseId!, queryResult.data);
  return new Response(JSON.stringify(result), { status: 200 });
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { horseId } = params;
  const horseExists = await verifyHorseOwnership(locals.supabase, horseId!);
  if (!horseExists) {
    return new Response(JSON.stringify({ error: "Horse not found" }), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parseResult = createHealthEventSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({ error: parseResult.error.flatten() }),
      { status: 400 }
    );
  }

  const healthEvent = await createHealthEvent(locals.supabase, horseId!, parseResult.data);
  return new Response(JSON.stringify({ data: healthEvent }), { status: 201 });
};
```

### Krok 6: Implementacja Timeline Service

```typescript
// src/lib/services/timeline.service.ts
import type { SupabaseClient } from "@/db/supabase.client";
import type { TimelineDTO, TimelineDayDTO } from "@/types";

export async function getTimeline(
  supabase: SupabaseClient,
  horseId: string,
  weekStart: string   // YYYY-MM-DD (poniedziałek)
): Promise<TimelineDTO> {
  const weekEnd = getWeekEnd(weekStart);  // oblicz niedzielę (+6 dni)
  const today = new Date().toISOString().split("T")[0];

  const [{ data: healthEvents }, { data: dailyLogs }] = await Promise.all([
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

  const days = assembleDays(weekStart, weekEnd, healthEvents ?? [], dailyLogs ?? [], today);
  return { week_start: weekStart, week_end: weekEnd, days };
}
```

### Krok 7: Middleware — weryfikacja API routes

Zaktualizuj `src/middleware/index.ts`, aby endpointy `/api/*` (z wyjątkiem `/api/auth/*`) automatycznie zwracały `401` przy braku sesji, zamiast przekierowywać do strony logowania:

```typescript
// W middleware — obsługa API routes
if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/auth/")) {
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### Krok 8: Weryfikacja i linting

Po zaimplementowaniu każdej grupy endpointów:
1. Uruchom `npm run lint` — napraw wszystkie błędy ESLint
2. Uruchom `npm run build` — sprawdź czy kompilacja TypeScript przebiega bez błędów
3. Ręcznie przetestuj kluczowe ścieżki: happy path, 401 bez sesji, 404 przy cudzym horseId, 400 przy błędnych danych
4. Sprawdź partial success dla `/sync` — wyślij mix poprawnych i błędnych wpisów

### Kolejność implementacji (rekomendowana)

1. Zod schemas (`src/lib/validation/`)
2. `horses.service.ts` + `GET /api/horses` + `POST /api/horses` (potrzebne do testów nested routes)
3. `GET /api/horses/:id` + `PATCH` + `DELETE`
4. `health-events.service.ts` + pełny CRUD dla health events
5. `daily-logs.service.ts` + pełny CRUD + upsert dla daily logs
6. Sync endpoints (`/sync`) dla obu zasobów
7. `timeline.service.ts` + `GET /timeline`
8. Middleware update dla API 401 handling
9. Linting + build check
