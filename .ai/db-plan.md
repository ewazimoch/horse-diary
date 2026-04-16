# Schemat bazy danych PostgreSQL — Horse diary

## 1. Tabele

### 1.1. Typy wyliczeniowe (ENUM)

```sql
CREATE TYPE health_event_type AS ENUM (
  'farrier',      -- Kowal
  'vet',          -- Weterynarz
  'vaccination',  -- Szczepienie
  'deworming'     -- Odrobaczanie
  'dentist'       -- Dentysta  
);

CREATE TYPE activity_type AS ENUM (
  'longing',      -- Lonżowanie
  'riding',       -- Jazda na placu
  'groundwork',   -- Praca z ziemi
  'walk',         -- Spacer
  'care',         -- Pielęgnacja
  'trail',        -- Wyjazd w teren
  'other'         -- Inne
);
```

### 1.2. Tabela `profiles`

Profil użytkownika powiązany 1:1 z `auth.users` (tabela zarządzana przez Supabase Auth — nie tworzymy jej ręcznie). Tworzony automatycznie przez trigger po rejestracji.

| Kolumna      | Typ                  | Ograniczenia                                        |
| ------------ | -------------------- | --------------------------------------------------- |
| `id`         | `UUID`               | `PRIMARY KEY`, `REFERENCES auth.users(id) ON DELETE CASCADE` |
| `created_at` | `TIMESTAMPTZ`        | `NOT NULL DEFAULT now()`                            |
| `updated_at` | `TIMESTAMPTZ`        | `NOT NULL DEFAULT now()`                            |

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.3. Tabela `horses`

Profil konia należącego do użytkownika. Jeden użytkownik może mieć wiele koni.

| Kolumna      | Typ             | Ograniczenia                                              |
| ------------ | --------------- | --------------------------------------------------------- |
| `id`         | `UUID`          | `PRIMARY KEY DEFAULT gen_random_uuid()`                   |
| `user_id`    | `UUID`          | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`      |
| `name`       | `VARCHAR(100)`  | `NOT NULL`                                                |
| `birth_year` | `SMALLINT`      |                                                           |
| `breed`      | `VARCHAR(100)`  |                                                           |
| `color`      | `VARCHAR(50)`   |                                                           |
| `created_at` | `TIMESTAMPTZ`   | `NOT NULL DEFAULT now()`                                  |
| `updated_at` | `TIMESTAMPTZ`   | `NOT NULL DEFAULT now()`                                  |

```sql
CREATE TABLE horses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  birth_year  SMALLINT,
  breed       VARCHAR(100),
  color       VARCHAR(50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.4. Tabela `health_events`

Wpisy Modułu Zdrowie — zdarzenia medyczne i pielęgnacyjne powiązane z koniem.

| Kolumna       | Typ                  | Ograniczenia                                          |
| ------------- | -------------------- | ----------------------------------------------------- |
| `id`          | `UUID`               | `PRIMARY KEY DEFAULT gen_random_uuid()`               |
| `horse_id`    | `UUID`               | `NOT NULL REFERENCES horses(id) ON DELETE CASCADE`    |
| `event_type`  | `health_event_type`  | `NOT NULL`                                            |
| `event_date`  | `DATE`               | `NOT NULL`                                            |
| `notes`       | `TEXT`               |                                                       |
| `ai_metadata` | `JSONB`              |                                                       |
| `created_at`  | `TIMESTAMPTZ`        | `NOT NULL DEFAULT now()`                              |
| `updated_at`  | `TIMESTAMPTZ`        | `NOT NULL DEFAULT now()`                              |

```sql
CREATE TABLE health_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id     UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  event_type   health_event_type NOT NULL,
  event_date   DATE NOT NULL,
  notes        TEXT,
  ai_metadata  JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.5. Tabela `daily_logs`

Wpisy Modułu Dzień — codzienny dziennik aktywności i samopoczucia konia. Ograniczony do jednego wpisu na konia na dzień.

| Kolumna        | Typ               | Ograniczenia                                          |
| -------------- | ----------------- | ----------------------------------------------------- |
| `id`           | `UUID`            | `PRIMARY KEY DEFAULT gen_random_uuid()`               |
| `horse_id`     | `UUID`            | `NOT NULL REFERENCES horses(id) ON DELETE CASCADE`    |
| `log_date`     | `DATE`            | `NOT NULL`                                            |
| `mood_score`   | `SMALLINT`        | `NOT NULL CHECK (mood_score BETWEEN 1 AND 3)`        |
| `activities`   | `activity_type[]` | `NOT NULL CHECK (array_length(activities, 1) >= 1)`  |
| `notes`        | `TEXT`            |                                                       |
| `ai_metadata`  | `JSONB`           |                                                       |
| `created_at`   | `TIMESTAMPTZ`     | `NOT NULL DEFAULT now()`                              |
| `updated_at`   | `TIMESTAMPTZ`     | `NOT NULL DEFAULT now()`                              |

```sql
CREATE TABLE daily_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horse_id     UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
  log_date     DATE NOT NULL,
  mood_score   SMALLINT NOT NULL CHECK (mood_score BETWEEN 1 AND 3),
  activities   activity_type[] NOT NULL CHECK (array_length(activities, 1) >= 1),
  notes        TEXT,
  ai_metadata  JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_daily_logs_horse_date UNIQUE (horse_id, log_date)
);
```

## 2. Relacje między tabelami

```
auth.users  1 ——— 1  profiles
                        |
                        | 1
                        |
                        ∞
                      horses
                      /    \
                    ∞        ∞
          health_events    daily_logs
```

| Relacja                        | Kardynalność | Klucz obcy                  | Kaskada         |
| ------------------------------ | ------------ | --------------------------- | --------------- |
| `auth.users` → `profiles`     | 1:1          | `profiles.id`               | `ON DELETE CASCADE` |
| `profiles` → `horses`         | 1:N          | `horses.user_id`            | `ON DELETE CASCADE` |
| `horses` → `health_events`    | 1:N          | `health_events.horse_id`    | `ON DELETE CASCADE` |
| `horses` → `daily_logs`       | 1:N          | `daily_logs.horse_id`       | `ON DELETE CASCADE` |

## 3. Indeksy

```sql
-- Szybkie wyszukiwanie koni użytkownika (przełącznik profili)
CREATE INDEX idx_horses_user_id ON horses(user_id);

-- Oś Czasu: zapytania o wpisy zdrowotne danego konia w zakresie dat
CREATE INDEX idx_health_events_horse_date ON health_events(horse_id, event_date);

-- Oś Czasu: zapytania o wpisy dzienne danego konia w zakresie dat
-- Ograniczenie UNIQUE(horse_id, log_date) automatycznie tworzy indeks,
-- ale deklarujemy go jawnie dla czytelności dokumentacji.
-- W praktyce wystarczy indeks z ograniczenia uq_daily_logs_horse_date.

-- Widoki Agregujące: filtrowanie wg typu zdarzenia zdrowotnego
CREATE INDEX idx_health_events_type ON health_events(event_type);
```

## 4. Polityki Row Level Security (RLS)

### 4.1. Włączenie RLS

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
```

### 4.2. Polityki dla tabeli `profiles`

```sql
-- Użytkownik widzi i edytuje wyłącznie własny profil
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

### 4.3. Polityki dla tabeli `horses`

```sql
CREATE POLICY "horses_select_own"
  ON horses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "horses_insert_own"
  ON horses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "horses_update_own"
  ON horses FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "horses_delete_own"
  ON horses FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
```

### 4.4. Polityki dla tabeli `health_events`

Weryfikacja przynależności wpisu do konia użytkownika odbywa się przez podzapytanie na tabeli `horses`.

```sql
CREATE POLICY "health_events_select_own"
  ON health_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = health_events.horse_id
        AND horses.user_id = auth.uid()
    )
  );

CREATE POLICY "health_events_insert_own"
  ON health_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = health_events.horse_id
        AND horses.user_id = auth.uid()
    )
  );

CREATE POLICY "health_events_update_own"
  ON health_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = health_events.horse_id
        AND horses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = health_events.horse_id
        AND horses.user_id = auth.uid()
    )
  );

CREATE POLICY "health_events_delete_own"
  ON health_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = health_events.horse_id
        AND horses.user_id = auth.uid()
    )
  );
```

### 4.5. Polityki dla tabeli `daily_logs`

```sql
CREATE POLICY "daily_logs_select_own"
  ON daily_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = daily_logs.horse_id
        AND horses.user_id = auth.uid()
    )
  );

CREATE POLICY "daily_logs_insert_own"
  ON daily_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = daily_logs.horse_id
        AND horses.user_id = auth.uid()
    )
  );

CREATE POLICY "daily_logs_update_own"
  ON daily_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = daily_logs.horse_id
        AND horses.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = daily_logs.horse_id
        AND horses.user_id = auth.uid()
    )
  );

CREATE POLICY "daily_logs_delete_own"
  ON daily_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM horses
      WHERE horses.id = daily_logs.horse_id
        AND horses.user_id = auth.uid()
    )
  );
```

## 5. Dodatkowe uwagi

### 5.1. Trigger automatycznego tworzenia profilu

Po rejestracji użytkownika w `auth.users`, trigger automatycznie tworzy wiersz w `profiles`:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### 5.2. Trigger automatycznej aktualizacji `updated_at`

Wspólna funkcja obsługująca automatyczne odświeżanie znacznika czasu:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_horses_updated_at
  BEFORE UPDATE ON horses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_health_events_updated_at
  BEFORE UPDATE ON health_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_daily_logs_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 5.3. Strategia usuwania danych

Stosowany jest mechanizm twardego usuwania (Hard Delete) za pomocą standardowej instrukcji SQL `DELETE`. Decyzja podjęta na etapie planowania — upraszcza zapytania i jest wystarczająca dla skali MVP.

### 5.4. Kolumna `ai_metadata` (JSONB)

Obecna w tabelach `health_events` i `daily_logs`. Przeznaczona na przyszłe metadane generowane przez modele LLM (OpenRouter.ai). Struktura kluczy JSON zostanie zdefiniowana na etapie implementacji integracji AI. Kolumna jest opcjonalna (`NULL` domyślnie).

### 5.5. Synchronizacja offline (PWA / Upsert)

Ograniczenie `UNIQUE(horse_id, log_date)` w tabeli `daily_logs` umożliwia bezkonfliktową logikę `INSERT ... ON CONFLICT (horse_id, log_date) DO UPDATE`, kluczową przy synchronizacji danych z IndexedDB po odzyskaniu połączenia sieciowego.

### 5.6. Typowanie ENUM a elastyczność

Typy `health_event_type` i `activity_type` implementują predefiniowane zbiory wartości. Dodanie nowej wartości do ENUM w PostgreSQL wymaga migracji (`ALTER TYPE ... ADD VALUE`), jednak jest operacją bezpieczną i nieblokującą. Wybór ENUM zamiast osobnej tabeli słownikowej zapewnia lepszą walidację na poziomie bazy i prostsze zapytania, co jest preferowane przy stabilnym i niewielkim zbiorze wartości w MVP.

### 5.7. Normalizacja

Schemat jest znormalizowany do 3NF. Jedynym świadomym odstępstwem jest przechowywanie aktywności jako tablicy `activity_type[]` w `daily_logs` zamiast osobnej tabeli łączącej — decyzja podjęta na etapie planowania w celu uproszczenia zapytań i redukcji liczby JOIN-ów dla najczęstszego widoku (Oś Czasu).
