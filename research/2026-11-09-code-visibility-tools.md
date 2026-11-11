# Raport: jak oglądać kod i pracę agenta na żywo

**Wniosek:** najbliższy gotowy zestaw to **VS Code lub code-server + CodeTour + ttyd**. CodeTour dobrze prowadzi przez pliki i linie z opisami. `ttyd` pokazuje terminal w przeglądarce, ale agent musi działać w terminalu uruchomionym przez `ttyd`; nie podłącza się automatycznie do istniejącego panelu a terminal host. Jeśli priorytetem jest proste oglądanie zmian, desktopowy VS Code może otwierać plik na wskazanej linii komendą `code --goto`.

## 1. Kod w przeglądarce lub edytorze

| Narzędzie | Co daje i jak agent je uruchamia | Windows, utrzymanie, koszt | Przydatność do nauki |
|---|---|---|---|
| **code-server** | VS Code w przeglądarce. Serwer obsługuje link z parametrem `payload`, który otwiera konkretny plik i pozycję. Wzorzec URL: `https://host/?folder=<ścieżka>&payload=[["gotoLineMode","true"],["openFile","vscode-remote://host/<ścieżka>/src/agents.ts:42:1"]]`. Parametr `payload` trzeba zakodować dla URL. | Projekt jest utrzymywany; repozytorium publikuje kolejne wydania, ale Windows nie jest typową ścieżką instalacji opisanych w instrukcji — praktycznie należy rozważyć uruchomienie w WSL. Aktualny numer wydania: **UNVERIFIED**. Bezpłatny, open source. [FAQ: otwieranie pliku i linii](https://github.com/coder/code-server/blob/main/docs/FAQ.md), [instalacja](https://github.com/coder/code-server/blob/main/docs/install.md) | **Wysoka** dla kodu na żywo: agent może wysłać link do bieżącego pliku i linii. Komentarze edukacyjne wymagają osobnej warstwy, np. CodeTour. |
| **VS Code desktop** | Agent może uruchomić `code --goto "src/agents.ts:42:1"` albo otworzyć URI `vscode://file/C:/projekt/src/agents.ts:42:1`. Do diffu: `code --diff przed.ts po.ts`. | Oficjalnie wspierany na Windows. Aktualna dokumentacja CLI; koszt zależy od użytych dodatków i usług, sam edytor jest bezpłatny. [CLI i wzorce URI](https://code.visualstudio.com/docs/configure/command-line) | **Wysoka** do pokazywania pliku i aktualnej linii. To widok edytora, nie strona WWW; nie wiadomo, czy T3 Code obsługuje przekazanie fokusowanego widoku z zewnętrznego `vscode://`. |
| **GitHub permalink** | Agent może podać link do wersji kodu w repozytorium, z linią lub zakresem linii. Link odnosi się do konkretnego commita, więc dobrze nadaje się do omówienia zakończonej zmiany. Wzorzec zwykle wygląda jak `https://github.com/OWNER/REPO/blob/COMMIT/path/file.ts#L42-L55`. | Wymaga repozytorium dostępnego z GitHub. Bezpłatne funkcje zależą od widoczności repozytorium i konta. Aktualna obsługa zakresów linii: **UNVERIFIED** w tej kwerendzie. | **Średnia**. Link jest trwały i dokładny, ale nie pokazuje niezacommitowanych zmian na żywo. |
| **Monaco Editor** | Biblioteka edytora kodu do osadzenia we własnej stronie; API pozwala ustawić pozycję i dekoracje. | Działa w przeglądarce, ale wymaga przygotowania aplikacji i synchronizacji jej zawartości z plikami. Bezpłatna biblioteka open source. [repozytorium i playground](https://github.com/microsoft/monaco-editor) | Potencjalnie **bardzo wysoka**, lecz nie jest gotową stroną do oglądania projektu. Wymaga własnego rozwiązania, więc nie jest pierwszym wyborem. |
| **Sourcegraph** | Rozbudowane wyszukiwanie i nawigacja po kodzie; przydatne do śledzenia symboli i zależności między plikami. | Oferuje hostowane i własne warianty. Aktualna dostępność, cena oraz precyzyjny URL do linii: **UNVERIFIED**. | **Średnia**: mocny kontekst kodu, ale mniej dopasowany do prowadzonego tutorialu. |

Code-server dokumentuje bezpośrednie otwieranie pliku w linii przez URL. Dla agenta w innej maszynie lub środowisku warto sprawdzić, czy przeglądarka the developer może dotrzeć do tego hosta oraz czy ścieżka wskazuje na te same pliki, które agent modyfikuje. [Dokumentacja parametrów URL code-server](https://github.com/coder/code-server/blob/main/docs/FAQ.md)

## 2. Krokowe wycieczki po kodzie

### CodeTour — najlepsze dopasowanie

CodeTour to rozszerzenie VS Code do tworzenia i odtwarzania opisanych kroków w kodzie. Kroki mogą wskazywać plik i numer linii, a opis obsługuje Markdown. Trasę można zapisać jako plik JSON `.tour`, np. w `.tours/`, `.vscode/tours/` albo `.github/tours/`. Agent może więc utworzyć trasę jako część pracy, a the developer przechodzić przez nią w edytorze.

- Typowy prompt agenta: „Utwórz `.tours/agent-guardrails.tour` z 5 krokami wyjaśniającymi ścieżkę obsługi zgłoszenia, guardrail i test”.
- Agent może też otworzyć trasę przez URI CodeTour: `vscode://codetour.start?tour=<nazwa-lub-ścieżka>&step=1`. Dokładne kodowanie i rozpoznawanie `tour` warto sprawdzić w zainstalowanej wersji rozszerzenia.
- Rozszerzenie jest bezpłatne i open source. Repozytorium wskazuje obsługę plików `.tour` i schemat; na stronie wydań widoczna jest wersja `0.0.59`, lecz dokładna data oraz świeżość utrzymania należy uznać za **UNVERIFIED** w tym raporcie. [README i format tour](https://github.com/microsoft/codetour), [wydania](https://github.com/microsoft/codetour/releases)

**Ocena edukacyjna: bardzo wysoka.** To najbliższe wymaganiu „pokaż tę linię i wyjaśnij, dlaczego ją zmieniono”.

## 3. Terminal na żywo w przeglądarce

| Narzędzie | Jak uruchomić | Windows, dojrzałość, koszt | Przydatność do nauki |
|---|---|---|---|
| **ttyd** | Uruchamia terminal dostępny jako strona WWW. Przykład PowerShell: `ttyd -p 7681 -W pwsh.exe`; następnie otworzyć `http://localhost:7681`. Można podać katalog roboczy przez `-w`. | Projekt jawnie wspiera Windows, w tym instalację przez `winget install tsl0922.ttyd`. Licencja MIT. Najnowsza data wydania: **UNVERIFIED**; repozytorium jest aktywne. [README, Windows i opcje](https://github.com/tsl0922/ttyd) | **Wysoka** do obserwowania komend i wyjścia. Zapewnia interaktywny terminal, ale polecenia agenta muszą działać w tej sesji. Udostępnianie portu innym osobom wymaga właściwego zabezpieczenia. |
| **GoTTY** | Serwer terminala w przeglądarce, podobny do ttyd. | Aktualna kondycja projektu, Windows i najnowsze wydanie: **UNVERIFIED**. | Funkcjonalnie pasuje, ale brak potwierdzenia świeżości utrzymania czyni `ttyd` lepszym kandydatem. |
| **asciinema + player** | `asciinema rec session.cast` nagrywa sesję; player osadza później nagranie na stronie. Player ma sterowanie odtwarzaniem i markerami. | Player JavaScript jest aktywnie wydawany; wersja `3.17.0` była widoczna w wynikach wyszukiwania. Licencja i instalacja CLI zależą od komponentu. [wydania playera](https://github.com/asciinema/asciinema-player/releases), [dokumentacja osadzania i transmisji](https://github.com/asciinema/asciinema.github.io/blob/main/docs/getting-started.md) | **Średnia** do nauki po fakcie, **niska** jako prosty podgląd live. To nagranie/odtwarzanie sesji, a nie bezpośrednie lustro istniejącego terminala a terminal host. |
| **Terminal zintegrowany w code-server** | W przeglądarkowym VS Code można otworzyć zintegrowany terminal w workspace. | Część code-server; Windows najłatwiej rozważać przez WSL. Aktualne szczegóły wydania: **UNVERIFIED**. | **Wysoka**, jeśli agent pracuje w tym samym środowisku i terminalu. Nie zapewnia sam z siebie podglądu już działającego, osobnego procesu w a terminal host. |

`ttyd` może uruchomić dowolną komendę i ma klienta terminalowego opartego na przeglądarce. Do pokazywania pracy Claude Code oznacza to uruchomienie Claude w terminalu utworzonym przez `ttyd` albo znalezienie osobnego, już istniejącego sposobu udostępnienia konkretnego pane’a a terminal host. Właśnie tego drugiego wariantu nie potwierdziłem w źródłach. [Opcje i tryb uruchamiania](https://github.com/tsl0922/ttyd)

## 4. Jak agent może kierować widokiem

| Sposób | Wzorzec | Co warto wiedzieć |
|---|---|---|
| VS Code CLI | `code --goto "src/agents.ts:42:1"` | Oficjalny i prosty sposób na otwarcie konkretnej linii w VS Code. [Dokumentacja CLI](https://code.visualstudio.com/docs/configure/command-line) |
| VS Code URI | `vscode://file/C:/projekt/src/agents.ts:42:1` | Windows obsługuje przekazanie takiego linku do systemu URI. Nie potwierdzono, że T3 Code przekieruje go do właściwego edytora lub panelu. [Dokumentacja URL](https://code.visualstudio.com/docs/configure/command-line) |
| code-server URL | `?folder=...&payload=...openFile...:42:1` | Otwiera ścieżkę w przeglądarkowym VS Code po załadowaniu workbench. Wymaga działającej instancji i dostępu do workspace. [FAQ code-server](https://github.com/coder/code-server/blob/main/docs/FAQ.md) |
| CodeTour URI | `vscode://codetour.start?...` | Może wystartować wskazaną wycieczkę i krok; przydatne do rozpoczęcia oprowadzania od konkretnego miejsca. [Kod obsługi URI](https://github.com/microsoft/codetour/blob/main/src/extension.ts) |
| Live Share | Współdzielenie sesji edytora VS Code | Może udostępnić pliki i terminal zdalnemu uczestnikowi. Dokładny przepływ dla Claude Code w T3 Code i a terminal host oraz aktualne ograniczenia: **UNVERIFIED**. Nie zakładałbym, że agent sam wywoła bezpieczne udostępnienie bez integracji lub działania użytkownika. |

## 5. Podgląd aktywności agentów AI

Są narzędzia do wizualizacji przebiegu sesji, ale zbadane wyniki nie wskazały jednego dojrzałego, gotowego rozwiązania, które równocześnie:

1. działa z Claude Code uruchomionym w T3 Code i a terminal host,
2. pokazuje edycje kodu na żywo,
3. pozwala agentowi kierować przeglądarką do wskazanej linii,
4. prowadzi Pawła po zmianach z edukacyjnymi komentarzami.

Znalezione przykłady obserwatorów i przeglądarek sesji Claude Code to głównie projekty społecznościowe; dojrzałość, utrzymanie, Windows i koszt pozostają **UNVERIFIED**. Nie rekomenduję ich jako podstawy rozwiązania. CodeTour plus edytor pokazujący wspólny workspace rozwiązuje część edukacyjną bardziej bezpośrednio. Natywny terminal agentów pozostaje osobnym problemem.

## 6. Sprawdzenie lokalne

Sprawdziłem wskazany lokalny katalog przez próbę `where.exe code`, `where.exe code-server`, `where.exe ttyd` oraz wyszukania `open-md` i `open-diff` w lokalnym katalogu umiejętności (harness command bindings). Całe wywołanie zostało **odrzucone przed uruchomieniem** przez hook `PreToolUse`, regułę `scan-scope-guard`, ponieważ obejmowało skanowanie poza dozwolonymi katalogami. To oznacza, że **nie mam wyniku `where` ani odczytu instrukcji `open-md`/`open-diff`**; nie mogę stwierdzić, czy te programy są zainstalowane ani co dokładnie robią.

## Rekomendacja: trzy narzędzia

1. **VS Code desktop + CodeTour** do kodu, linii, objaśnień i krokowych wycieczek. Agent otwiera wskazaną linię przez `code --goto`, a po zmianie zapisuje trasę `.tour` z komentarzami. To najprostsza sprawdzona ścieżka edukacyjna na Windows.
2. **ttyd** jako podgląd terminala w przeglądarce, pod warunkiem uruchamiania Claude Code w sesji `ttyd`. Nie zakładać, że pokaże istniejący terminal a terminal host.
3. **code-server** tylko jeśli warunkiem jest przeglądarkowy edytor zamiast desktopowego VS Code. Jego instalacja dla Windows najpewniej oznacza dodatkową konfigurację WSL, więc zwiększa liczbę ruchomych części.

Komendy instalacyjne na Windows:

```powershell
# Rozszerzenie CodeTour do VS Code
code --install-extension vsls-contrib.codetour

# Terminal przeglądarkowy
winget install tsl0922.ttyd

# Przykład uruchomienia terminala PowerShell do podglądu
ttyd -p 7681 -W pwsh.exe
```

Instalator `code-server` polecany przez projekt jest przeznaczony dla Linux/macOS/FreeBSD; na Windows należy najpierw wybrać i skonfigurować środowisko WSL. Nie podaję komendy instalacji code-server dla Windows jako zweryfikowanej ścieżki natywnej. [Instrukcja instalacji](https://github.com/coder/code-server/blob/main/docs/install.md)

**Następny krok:** po odblokowaniu lokalnego odczytu sprawdzić `where.exe` dla trzech programów oraz instrukcje prywatne `open-md` i `open-diff`; wtedy można zawęzić rekomendację do narzędzi rzeczywiście dostępnych na tym komputerze.