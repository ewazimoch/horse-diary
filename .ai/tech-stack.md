# Stos Technologiczny (Tech Stack) - Horse diary

## 1. Frontend i Interfejs Użytkownika (UI)
- Astro 5: Główny framework aplikacyjny (wykorzystany zgodnie z dostarczonym środowiskiem kursowym).
- React 19: Biblioteka do budowy interaktywnych komponentów i zarządzania stanem widoków (osadzana w Astro z wykorzystaniem architektury "Wysp").
- TypeScript 5: Statyczne typowanie zapewniające wyższe bezpieczeństwo kodu, łatwiejsze utrzymanie i skalowalność.
- Tailwind 4: Framework CSS typu utility-first do szybkiego, responsywnego i spójnego stylowania aplikacji.
- Shadcn/ui: Zestaw dostępnych, gotowych do użycia i w pełni modyfikowalnych komponentów interfejsu (np. formularze, nawigacja, powiadomienia Toast).

## 2. Backend, Baza Danych i Autoryzacja
- Supabase: Platforma Backend-as-a-Service (BaaS) oparta na silniku PostgreSQL. Odpowiada w projekcie za:
  - Bezpieczną autoryzację i zarządzanie sesjami użytkowników.
  - Relacyjną bazę danych do przechowywania profili, dzienników i historii medycznej.
  - Ochronę dostępu do danych na poziomie bazy (Row Level Security - RLS).

## 3. Integracja Sztucznej Inteligencji (AI)
- OpenRouter.ai: Zunifikowany interfejs API ułatwiający dostęp do wielu różnych modeli językowych LLM, zapewniający elastyczność i kontrolę kosztów w zadaniach wymagających wsparcia AI.

## 4. Infrastruktura, Hosting i CI/CD
- GitHub Actions: Narzędzie do automatyzacji procesów Continuous Integration i Continuous Deployment (CI/CD), budujące aplikację po każdej zmianie w repozytorium.
- DigitalOcean: Chmura hostingowa będąca docelowym środowiskiem uruchomieniowym dla aplikacji, dostosowana do wytycznych projektu edukacyjnego.