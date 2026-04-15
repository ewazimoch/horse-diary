# Dokument wymagań produktu (PRD) - Horse diary

## 1. Przegląd produktu
Aplikacja Horse diary w wersji MVP to system zaprojektowany w podejściu Mobile-First, mający na celu cyfryzację zarządzania logistyką jeździecką oraz historią zdrowia koni. Jako aplikacja typu Progressive Web App (PWA), umożliwia użytkownikom płynne wprowadzanie danych bezpośrednio ze stajni, oferując podstawowe wsparcie dla trybu offline. Głównym strumieniem wartości jest zapewnienie prostych operacji typu CRUD dla codziennych dzienników pracy oraz kluczowych wydarzeń medycznych. Architektura opiera się na stosie technologicznym: Astro 5, React 19, TypeScript 5, Tailwind 4, komponentach Shadcn/ui, autoryzacji i bazie danych Supabase oraz hostingu w chmurze DigitalOcean.

## 2. Problem użytkownika
Tradycyjne metody rejestrowania historii zdrowia i logistyki związanej z końmi opierają się na papierowych notesach lub uniwersalnych aplikacjach kalendarzowych. Rozwiązania te są nieefektywne, nieodporne na specyficzne warunki stajenne (brud, wilgoć) i brakuje im dedykowanego kontekstu jeździeckiego. Właściciele koni mają trudności z utrzymaniem spójnej, szybkiej do odzyskania historii wizyt weterynarzy czy kowali, co utrudnia planowanie kolejnych zabiegów. Ponadto brakuje zintegrowanego narzędzia do codziennego notowania pracy z koniem oraz jego samopoczucia, co jest kluczowe do wczesnego wykrywania mikrourazów lub spadków kondycji przed wystąpieniem poważniejszych problemów.

## 3. Wymagania funkcjonalne
System obejmuje następujące kluczowe obszary funkcjonalności:

Zarządzanie kontem i autoryzacja:
Bezpieczna rejestracja i logowanie użytkowników oparte na usługach Supabase. Użytkownik posiada jedno główne konto powiązane z własnymi danymi dostępowymi.

Zarządzanie profilami koni:
Możliwość obsługi wielu zwierząt przez jednego użytkownika. System posiada łatwo dostępny przełącznik profili w górnym pasku nawigacji (komponent Select z biblioteki Shadcn/ui), pozwalający na szybką zmianę kontekstu wprowadzanego wpisu dla wybranego konia. Krótki ekran onboardingowy przy pierwszym logowaniu pyta wyłącznie o imię pierwszego konia.

Moduł Zdrowie (Terminarz wydarzeń):
Rejestracja zdarzeń medycznych i pielęgnacyjnych. Obsługiwane typy wydarzeń to: Kowal, Weterynarz, Szczepienie, Odrobaczanie. Użytkownik wybiera datę oraz może dodać krótką notatkę tekstową.

Moduł Dzień (Codzienny Dziennik):
Ustrukturyzowany i krótki formularz podsumowujący dany dzień, zoptymalizowany pod kątem szybkości obsługi. Pola formularza to:
- Data i dzień tygodnia
- Ogólny oziom zadowolenia/samopoczucia (wybór jednej z trzech emotikon)
- Wybór aktywności (wielokrotny wybór: minimum 1 z 6 predefiniowanych ikon oraz opcja Inne)
- Opcjonalne pole opisu tekstowego

Oś Czasu (Dashboard):
Zunifikowany, statyczny widok obejmujący 7 dni od poniedziałku do niedzieli, łączący chronologicznie wpisy z Modułu Dzień oraz Modułu Zdrowie. Wydarzenia z Modułu Zdrowia są priorytetyzowane i przypinane na samej górze podsumowania danego dnia, ponad codziennymi logami. Planowane i zrealizowane wydarzenia są wyraźnie rozróżnialne wizualnie. Operacje takie jak Edytuj i Usuń są dostępne z poziomu rozwijanego menu (Dropdown Menu, ikona trzech kropek) przy każdym wpisie.

Widoki Agregujące:
Dodatkowe ekrany lub filtry wyświetlające wyłącznie wydarzenia jednego wybranego typu (na przykład wyłącznie historia i zaplanowane wizyty kowala), ułatwiające przeglądanie długoterminowej historii.

Tryb Offline i PWA:
Wykorzystanie wtyczki vite-plugin-pwa w środowisku Astro. Interfejsy obsługiwane przez React (architektura Wysp) wykorzystują lokalną pamięć przeglądarki (IndexedDB) do zapisu wpisów i kolejkowania ich w warunkach braku internetu. Po odzyskaniu łączności dane są synchronizowane z Supabase w tle, a użytkownik jest informowany o sukcesie za pomocą powiadomień asynchronicznych (komponent Toast).

## 4. Granice produktu
Poniższe elementy są jawnie wykluczone z zakresu obecnego MVP:
- Zautomatyzowany system powiadomień i przypomnień w formie push lub e-mail.
- Dedykowany moduł do szczegółowej analizy wyników badań weterynaryjnych oraz wprowadzania parametrów krwi.
- Obsługa wgrywania jakichkolwiek plików multimedialnych lub zdjęć (np. zdjęć kopyt, skanów badań).
- Rozbudowane pola dziennika, takie jak rejestrowanie temperatury, tętna, szczegółowej diety czy rodzaju sprzętu.
- Funkcjonalność generowania raportów, udostępniania i eksportu danych na zewnątrz aplikacji.

Nierozwiązane kwestie wymagające dalszego doprecyzowania w toku developmentu:
- Architektura nawigacji dla widoków agregujących: podjęcie ostatecznej decyzji, czy będą to oddzielne zakładki podstron, czy tylko nakładki filtrujące widok Osi Czasu.
- Konfiguracja środowiska w chmurze DigitalOcean: wybór pomiędzy zautomatyzowaną usługą App Platform a w pełni konfigurowalnym serwerem Droplet dla tego konkretnego środowiska testowego.

## 5. Historyjki użytkowników

- ID: US-001
- Tytuł: Rejestracja i logowanie użytkownika
- Opis: Jako nowy lub powracający użytkownik, chcę móc bezpiecznie założyć konto lub zalogować się za pomocą adresu e-mail i hasła, aby moje dane były chronione i przypisane do mnie.
- Kryteria akceptacji: Aplikacja udostępnia formularz rejestracji i logowania. Autoryzacja jest bezpośrednio obsługiwana przez API Supabase. Błędne dane logowania zwracają czytelny komunikat o błędzie.

- ID: US-002
- Tytuł: Pierwszy onboarding
- Opis: Jako nowy użytkownik, po pierwszym zalogowaniu chcę podać imię mojego konia, aby system utworzył podstawowy profil startowy, z którego mogę od razu zacząć korzystać.
- Kryteria akceptacji: Po poprawnej rejestracji wyświetla się jednorazowy ekran żądający tylko imienia konia. Podanie imienia tworzy profil w bazie i przenosi do głównej Osi Czasu.

- ID: US-003
- Tytuł: Przełączanie między profilami koni
- Opis: Jako użytkownik posiadający więcej niż jednego konia, chcę móc szybko przełączać się między ich profilami z poziomu menu głównego, aby wprowadzać dane do właściwego dziennika.
- Kryteria akceptacji: Górny pasek nawigacyjny zawiera komponent Select (Shadcn) wyświetlający listę koni przypisanych do konta użytkownika. Zmiana wyboru w selekcie odświeża kontekst aplikacji i wczytuje dane odpowiedniego zwierzęcia na Osi Czasu.

- ID: US-004
- Tytuł: Dodawanie codziennego wpisu
- Opis: Jako jeździec po treningu, chcę za pomocą prostego formularza dodać codzienny raport z opisem, wyborem ikon i oceną samopoczucia konia, aby śledzić jego rutynę.
- Kryteria akceptacji: Istnieje przycisk umożliwiający dodanie wpisu do Modułu Dzień. Formularz zawiera wymaganą datę, opcjonalny tekst, wymaganą ocenę z 3 emotikon do wyboru oraz wybór aktywności z zestawu ikon (minimum 1 ikona musi być zaznaczona). Po zatwierdzeniu wpis pojawia się na Osi Czasu.

- ID: US-005
- Tytuł: Rejestrowanie wizyty medycznej
- Opis: Jako opiekun konia, chcę dodać informację o wizycie kowala, weterynarza, szczepieniu lub odrobaczaniu z przypisaną datą, aby pamiętać o historii leczenia.
- Kryteria akceptacji: Formularz Modułu Zdrowie pozwala wybrać typ wydarzenia ze zdefiniowanej listy, wskazać datę (zarówno przeszłą, jak i przyszłą) oraz dodać krótką notatkę. Po zapisaniu, zdarzenie staje się widoczne.

- ID: US-006
- Tytuł: Przeglądanie tygodniowej Osi Czasu
- Opis: Jako użytkownik otwierający aplikację, chcę widzieć zintegrowaną listę wydarzeń z 7 dni (poniedziałek - niedziela), aby ocenić sytuację bieżącego tygodnia na jednym ekranie.
- Kryteria akceptacji: Domyślnym widokiem po zalogowaniu jest Oś Czasu. Wyświetla ona sztywny tydzień. Wpisy z Modułu Zdrowie dla danego dnia wyświetlają się zawsze na samej górze grupy dziennej, a wpisy z Modułu Dzień pod nimi. Zdarzenia planowane na przyszłość różnią się wizualnie (np. obramowaniem lub odcieniem) od zdarzeń już zrealizowanych w przeszłości.

- ID: US-007
- Tytuł: Działanie w trybie offline i synchronizacja
- Opis: Jako użytkownik przebywający w stajni ze słabym zasięgiem, chcę dodać wpis, który zostanie zapisany w pamięci telefonu i wysłany do chmury, gdy tylko odzyskam dostęp do internetu, aby nie tracić danych.
- Kryteria akceptacji: Aplikacja zainstalowana jako PWA pozwala na wypełnienie i zapisanie formularza (Moduł Dzień i Moduł Zdrowie) przy wyłączonym połączeniu sieciowym. Wpisy zapisują się w IndexedDB. Po wykryciu powrotu połączenia z siecią, aplikacja automatycznie przesyła oczekujące dane do Supabase. System wyświetla użytkownikowi widoczny komunikat (Toast) o udanej synchronizacji z bazą danych w tle.

- ID: US-008
- Tytuł: Edycja i usuwanie wpisów na Osi Czasu
- Opis: Jako właściciel konia, chcę móc poprawić błąd w dodanym wcześniej wpisie lub całkowicie go usunąć, aby utrzymać porządek i dokładność w historii.
- Kryteria akceptacji: Każdy wpis na Osi Czasu posiada zagnieżdżone menu rozwijane pod ikoną trzech kropek. Rozwinięcie menu ukazuje opcje Edytuj i Usuń. Kliknięcie Usuń prosi o potwierdzenie, a następnie usuwa wpis z widoku i bazy. Kliknięcie Edytuj otwiera formularz z wypełnionymi dotychczasowymi danymi i pozwala na ich modyfikację.

- ID: US-009
- Tytuł: Przeglądanie zagregowanej historii medycznej
- Opis: Jako osoba odpowiedzialna za terminy, chcę móc odfiltrować z głównego widoku wszystkie wpisy i zobaczyć np. wyłącznie historię wizyt kowala, aby określić termin kolejnej wizyty.
- Kryteria akceptacji: Interfejs oferuje mechanizm (niezależny widok lub nałożony filtr) pozwalający zawęzić wyświetlane dane wyłącznie do jednego z wybranych typów z Modułu Zdrowie. Wynik wyświetla te zdarzenia w porządku chronologicznym, ignorując podział na bieżący sztywny 7-dniowy tydzień.

## 6. Metryki sukcesu
Sukces MVP nie jest definiowany przez cele komercyjne ani liczbę instalacji w sklepach z aplikacjami, lecz przez skuteczną walidację jego podstawowej użyteczności w grupie docelowej.
- Cel główny zostanie osiągnięty, jeśli środowisko testowe grupy zamkniętej (twórca i jego znajomi, na łącznie ponad 2 konie) w pełni zaadoptuje aplikację, zastępując nią dotychczas używane narzędzia papierowe lub uniwersalne.
- Główne kryterium walidacji mierzalne przez metryki systemowe: bazy danych Supabase zarejestrują użycie polegające na wprowadzaniu średnio minimum 4 nowych wpisów tygodniowo (na użytkownika) przez nieprzerwany okres 4 tygodni od momentu rozpoczęcia fazy testowej na produkcji.