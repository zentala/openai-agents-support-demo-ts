# Parytet z demem OpenAI, prior art i gotowość do publikacji

## TLDR

Nasze demo ma już wszystko, co ma demo OpenAI, poza trzema rzeczami widocznymi na pierwszy rzut oka:
interaktywnym widgetem w czacie (mapa miejsc), zdarzeniem "context update" w panelu i hookami `on_handoff`.
Za to mamy znacznie więcej: zatwierdzanie zwrotów przez człowieka, guardrail wyjściowy, normalizację wejścia,
RAG, eval na 13 scenariuszach i testy. Nie znalazłem publicznego dema w TypeScript, które łączy te elementy
(sprawdzone: 2026-11-09, niepełne wyszukiwanie, patrz sekcja 3). Publikacja jest możliwa, ale wymaga:
pliku LICENSE z atrybucją OpenAI, ścieżki z zwykłym `OPENAI_API_KEY` bez password brokera, README po angielsku,
screenshotów i CI.

Następny krok: dodać 3 pozycje High z tabeli 1 (hook handoff + context update, start prompts, widget) oraz
naprawić blokery publikacji z sekcji 4.

Oznaczenie: UNVERIFIED = nie sprawdziłem w źródle.

---

## 1. Tabela parytetu

Skala: Importance High/Medium/Low, Points 1/2/3/5/8. "Ich" = `examples/openai-cs-agents-demo`.
"Nasze" = `app/`.

### 1a. Agenci, narzędzia, kontekst

| # | Element u nich | Co robi | Mamy? | Warto dodać? |
|---|---|---|---|---|
| 1 | 6 agentów (Triage, Flight Info, Booking, Seat, FAQ, Refunds) `python-backend/airline/agents.py:62-224` | Wielu wąskich specjalistów, ręczny graf handoffów | Partly: 3 agenci, `app/lib/agents/index.ts:56` (`handoffs: [faqAgent, ordersAgent]`) | Nie. 3 agentów jest czytelniejsze. Opcjonalnie 4. agent "Delivery" (Low, 3). Nie rozdmuchujemy. |
| 2 | Instrukcje jako funkcja z kontekstem (`seat_services_instructions(run_context, agent)`) `agents.py:23-40` | Prompt zależy od stanu rozmowy (numer rezerwacji, miejsce) | Partly: prompt dostaje sesję `app/lib/agents/prompts.ts:85` | Tak, mały zysk: dodać do promptu ostatnio omawiane zamówienie (Low, 2). |
| 3 | `RECOMMENDED_PROMPT_PREFIX` | Gotowy prefiks SDK o handoffach | Nie sprawdzone u nas (UNVERIFIED, grep po `RECOMMENDED_PROMPT` nie był robiony) | Tak, jeśli brak: 1 linia (Low, 1). |
| 4 | **`on_handoff` hooki** (`on_seat_booking_handoff`, `on_booking_handoff`) `agents.py:182-210` | W momencie handoffu kod uzupełnia kontekst (dane lotu, numer potwierdzenia) | **Nie** (brak `onHandoff` w `app/lib/agents`) | **Tak, High, 3.** W JS: `handoff(agent, { onHandoff })`. Pokazuje świadomy, deterministyczny kod w momencie przekazania (np. wczytaj profil i ostatnie zamówienia klienta do kontekstu przy przejściu do Orders). Mocny punkt rozmowy. |
| 5 | Mutowalny kontekst (`AirlineAgentContext`: seat, flight, vouchers, case id) `context.py:9-61` | Narzędzia zapisują do kontekstu; stan żyje między turami | Partly: kontekst tylko do odczytu (`SupportContext`, `app/lib/types.ts:12`), stan w `app/lib/data/store.ts` | Tak, razem z #4 i #6 (High, 3): kontekst rozmowy z polami `activeOrderId`, `refundCaseId`, `lastIntent`. |
| 6 | **Zdarzenie `context_update`** w Runner Output `server.py:~445-460`, `ui/components/runner-output.tsx:33,103,182-213` | Panel pokazuje, które pola kontekstu się zmieniły (diff) | **Nie** (brak `context_update` w `app/lib`, `app/components`) | **Tak, High, 3.** Wariant `{kind:"context_update", changes}` w `app/lib/types.ts:36` + wiersz w `runner-output.tsx`. Widać "co agent zapamiętał". |
| 7 | `public_context()` filtruje pola wewnętrzne `context.py:46-61` | UI widzi tylko bezpieczny podzbiór | Partly: `ConversationContext` pokazuje klienta `app/components/conversation-context.tsx` | Wchodzi w #6 (0 pkt dodatkowych). |
| 8 | `faq_lookup_tool`: if/else po słowach kluczowych `tools.py:14-41` | Atrapa FAQ | **Mamy lepsze:** `search_kb` z embeddingami `app/lib/tools/kb-and-escalation.ts`, `app/lib/kb/search.ts` | Nie (my wygrywamy). |
| 9 | `update_seat`, `cancel_flight`, `book_new_flight`, `get_matching_flights` `tools.py:77-353` | Mutacje bez żadnej zgody człowieka | Odpowiednik: `create_refund` z limitem, oknem 30 dni i zgodą `app/lib/tools/refund.ts` | Nie kopiować. Opcjonalnie: narzędzie "wymiana/zmiana adresu dostawy" (Medium, 3) jako drugie wywołanie z `needsApproval`. |
| 10 | `issue_compensation` + `ProgressUpdateEvent` ("Opening compensation case...") `tools.py:299-323` | Postęp długiej operacji widoczny w czacie | Partly: zdarzenia panelu streamują na żywo (`app/lib/runtime/event-bus.ts`), ale nie w czacie | Tak (Medium, 2): data-part `progress` pokazywany jako szara linia w czacie. |
| 11 | `baggage_tool` (zdefiniowany, nieużywany w agentach) `tools.py:148` | Martwy kod | n/d | Nie. |
| 12 | Wiele itinerariuszy / scenariuszy danych (`MOCK_ITINERARIES`: disrupted, on-time) `demo_data.py` | Dwa przepływy demo na tych samych danych | Mamy 3 klientów (PL/EN/DE) `app/data/customers.json` + 13 scenariuszy | Tak (Medium, 3): dopisać 1-2 zamówienia "w kłopocie" (opóźniona dostawa, uszkodzenie) żeby był flow wielokrokowy "dostawa -> uszkodzenie -> zwrot -> zgoda". Dane + 1 scenariusz. |

### 1b. Guardrails

| # | Element u nich | Mamy? | Warto? |
|---|---|---|---|
| 13 | Relevance guardrail (klasyfikator mini) `guardrails.py:30-52` | Yes: `app/lib/guardrails/input-guardrails.ts` | Nie dotyczy. |
| 14 | Jailbreak guardrail `guardrails.py:56-88` | Yes: ten sam plik, `jailbreak_guardrail` | Nie dotyczy. |
| 15 | Guardrail wyjściowy | **Mamy, oni nie:** `app/lib/guardrails/leak-guardrail.ts`, `leak-detect.ts` | n/d |
| 16 | Guardrails dołączone do KAŻDEGO agenta (`input_guardrails=[...]` w każdym `Agent`) | Partly: według docs JS guardrail wejścia działa tylko na pierwszym agencie w łańcuchu (https://openai.github.io/openai-agents-js/guides/handoffs/ przez wyniki wyszukiwania; UNVERIFIED w kodzie SDK) | Tak, sprawdzić i opisać w README (Medium, 1). Dobre pytanie rekrutacyjne. |
| 17 | Panel Guardrails: lista z czerwonym "tripped" + reasoning `ui/components/guardrails.tsx` | Yes: `app/components/guardrails.tsx` | Nie dotyczy. |

### 1c. UI

| # | Komponent u nich | Mamy? | Warto? |
|---|---|---|---|
| 18 | `agents-list.tsx` (aktywny agent podświetlony) | Yes: `app/components/agents-list.tsx` | Nie dotyczy. |
| 19 | `agent-panel.tsx` (ramka lewego panelu) | Yes: `app/components/agent-panel.tsx` | Nie dotyczy. |
| 20 | `conversation-context.tsx` (siatka pól) | Yes, prosta: `app/components/conversation-context.tsx` (30 linii vs 73) | Rozbudować razem z #6: podświetlenie zmienionego pola (Medium, 2). |
| 21 | `runner-output.tsx` (oś zdarzeń: message, handoff, tool_call, tool_output, context_update) | Yes, szersza: `app/components/runner-output.tsx` + kinds `normalization`, `kb_hits`, `approval_*`, `error`, `trace` `app/lib/types.ts:36-50` | Brakuje tylko `context_update` (#6). |
| 22 | `panel-section.tsx` | Yes: `app/components/panel-section.tsx` | Nie dotyczy. |
| 23 | **`seat-map.tsx`: interaktywny widget (klik w miejsce)** `ui/components/seat-map.tsx` (139 linii), wyzwalany narzędziem `display_seat_map` | **Nie** | **Tak, High, 5.** Odpowiednik u nas: karta zamówienia z przyciskami "Zwróć pozycję" / "Śledź paczkę" lub wybór pozycji do zwrotu (checkboxy), pokazana w czacie gdy agent wywoła `show_order_card`. W AI SDK: tool part / data part renderowany jako React. Najbardziej efektowne na rozmowie (widać "agent steruje UI"). |
| 24 | ChatKit (hostowany komponent czatu OpenAI, `chatkit-panel.tsx`) | Mamy własny czat na Vercel AI SDK `app/components/message-list.tsx`, `composer.tsx` | Nie przenosić. Własny czat to nasz atut (brak zależności od ChatKit i domain key). |
| 25 | **ChatKit `startScreen.prompts`** (3 chipsy startowe) `chatkit-panel.tsx:49-67` | Partly: `scenario-bar.tsx` (13 przycisków pod czatem) | Tak (Medium, 2): ekran powitalny w pustym czacie z 3 chipsami dla wybranego klienta, scenariusze zostają jako "tryb testowy". |
| 26 | **Efekty klienta** `ClientEffectEvent` + `onEffect` (`runner_state_update`, `runner_event_delta`, `runner_bind_thread`) `chatkit-panel.tsx:72-85`, `server.py` | Mamy funkcjonalny odpowiednik: data parts w strumieniu + `onData` `app/lib/client/use-support-session.ts`, `app/app/api/chat/route.ts` | Nie dotyczy (nasze jest prostsze, jeden kanał). |
| 27 | Osobny kanał snapshot/SSE (`/chatkit/state/stream`, `register_listener`) `server.py:496-523` | Mamy `event-bus.ts` | Nie dotyczy. |

### 1d. README / flow dema

| # | Flow u nich (README) | Mamy? | Warto? |
|---|---|---|---|
| 28 | Flow 1: zmiana miejsca -> status lotu -> FAQ (wielokrotny handoff) | Partly: scenariusze FAQ + zamówienie osobno | Tak (Medium, 2): jeden scenariusz "łańcuch" FAQ -> Orders -> Triage w jednej rozmowie. |
| 29 | Flow 2: anulowanie + relevance + jailbreak | Yes: scenariusze 2, 3 (jailbreak, hidden injection) `app/data/scenarios.json` | Nie dotyczy. |
| 30 | Flow 3: nieregularne operacje, wiele narzędzi w jednej turze, kompensata | Partly | Patrz #12. |
| 31 | Zrzut ekranu w README (`screenshot.jpg`) | Brak w repo (`research/*.png` jest w .gitignore) | Tak, patrz sekcja 4. |

### 1e. Podsumowanie priorytetów

| Pozycja | Importance | Points |
|---|---|---|
| Widget w czacie (#23) | High | 5 |
| `onHandoff` + mutowalny kontekst (#4, #5) | High | 3 |
| `context_update` w panelu (#6, #20) | High | 3 |
| Start prompts (#25) | Medium | 2 |
| Dane "w kłopocie" + scenariusz wielokrokowy (#12, #28) | Medium | 3 |
| Progress w czacie (#10) | Medium | 2 |
| Rozbudowa instrukcji o stan (#2, #3) | Low | 2 |
| Opis ograniczeń guardrail przy handoffie (#16) | Medium | 1 |
| **Suma** | | **21** (podzielić na 2 fale: widget + kontekst) |

---

## 2. Co mamy, a oni nie

- Zatwierdzanie człowieka (`needsApproval`, pauza i wznowienie `RunState`): `app/lib/tools/refund.ts`, `app/lib/runtime/approvals.ts`, `app/components/approvals.tsx`.
- Guardrail wyjściowy (wyciek promptu, PII, cudzych danych): `app/lib/guardrails/leak-guardrail.ts`.
- Normalizacja wejścia (podpisy, cytaty, znaki niewidoczne, numery kart): `app/lib/guardrails/normalize-input.ts`.
- RAG z embeddingami i wynikami w panelu: `app/lib/kb/search.ts`, `app/components/knowledge-hits.tsx`.
- Reguły biznesowe w kodzie (własność zamówienia, limit kwoty, okno 30 dni): `app/lib/tools/refund-rules.ts`.
- Własność wątku i tożsamość z sesji, nie z argumentów modelu: `app/lib/runtime/turn.ts:38`.
- Obsługa błędów narzędzi i sekcja błędów w panelu: `app/lib/tools/tool-error.ts`, `app/components/errors-section.tsx`.
- Ograniczenie historii bez rozcinania par tool call/result: `app/lib/runtime/history.ts`.
- Tracing z linkiem do trace id: `app/lib/runtime/run-support.ts:77`.
- Eval na 13 scenariuszach (`app/data/scenarios.json`, `app/scripts/eval.ts`) i testy jednostkowe (`app/tests/`). U nich: brak testów w demo (UNVERIFIED, nie przeszukiwałem całego repo, ale `python-backend` nie zawiera katalogu testów).
- Wielojęzyczność (PL/EN/DE) i symulowany wybór klienta.
- Brak zależności od ChatKit (hostowany widget OpenAI) i od backendu w Pythonie: jeden proces TypeScript.

---

## 3. Prior art (sprawdzone 2026-11-09)

Wyszukiwanie przez WebSearch i WebFetch. Daty ostatnich commitów nie były widoczne na stronach GitHub, więc oznaczam UNVERIFIED.

| Źródło | URL | Co obejmuje | Ostatnia aktualizacja | Czym różni się nasze |
|---|---|---|---|---|
| openai-agents-js, `examples/customer-service` | https://github.com/openai/openai-agents-js/tree/main/examples/customer-service | Triage + FAQ + Seat, tylko CLI, brak guardrails, brak UI | UNVERIFIED (repo ma ok. 1505 commitów) | My: UI web, panel Agent View, guardrails, zgoda, eval |
| openai-agents-js, `examples/nextjs` | https://github.com/openai/openai-agents-js/tree/main/examples/nextjs | Minimalny HITL w Next.js (pogoda, dialog zatwierdzenia, brak streamingu, baza w pamięci) | UNVERIFIED | Pokrywa tylko wzorzec zgody; my mamy domenę, wiele agentów, resume `RunState` w streamie |
| openai-agents-js, `examples/ai-sdk-ui` | https://github.com/openai/openai-agents-js/tree/main/examples/ai-sdk-ui | Strumień Agents SDK do AI SDK UI (Next.js, `createAiSdkUiMessageStreamResponse`) | UNVERIFIED | To nasz fundament techniczny; my dokładamy własne data parts i panel |
| openai-agents-js, `examples/agent-patterns` i `handoffs` | https://github.com/openai/openai-agents-js/tree/main/examples | Wzorce (human-in-the-loop skrypty CLI, handoffy) | UNVERIFIED | Skrypty CLI, nie produkt z UI |
| openai/openai-cs-agents-demo (oryginał) | https://github.com/openai/openai-cs-agents-demo | Python + Next.js/ChatKit, 6 agentów, 2 guardrails; 6.6k gwiazdek, 1.0k forków; MIT | UNVERIFIED (38 commitów) | Backend w Pythonie, brak zgody człowieka i guardrail wyjściowego |
| openai/openai-support-agent-demo | https://github.com/openai/openai-support-agent-demo | Next.js + Responses API + File Search, HITL (człowiek-agent) | UNVERIFIED | Nie używa Agents SDK |
| Parham-dev/ai-agent-cs | https://github.com/Parham-dev/ai-agent-cs | Platforma no-code, Next.js 15, OpenAI Agents SDK (pakiet JS UNVERIFIED), Prisma/Postgres/Supabase, MCP, guardrails wielowarstwowe, widget do osadzenia; MIT; 6 gwiazdek; "DO NOT use in production yet" | UNVERIFIED | To produkt/platforma, ciężka (DB, Supabase); my: mały, czytelny, edukacyjny reference demo |
| openai/openai-realtime-agents | https://github.com/openai/openai-realtime-agents | Next.js, TS, głos, flow "customer service retail" | UNVERIFIED | Głos, nie czat tekstowy ze zgodą |
| @pushary/openai-agents (komercyjny) | https://pushary.com/nl/human-in-the-loop-openai-agents-sdk | Zgoda na telefonie dla bramkowanych narzędzi | UNVERIFIED | Komercyjna integracja, nie demo |
| jawwad-ali/ai-customer-support-agent | https://github.com/jawwad-ali/ai-customer-support-agent | Gmail/WhatsApp/web, FastAPI (Python) | UNVERIFIED | Python |

### Wniosek

- Nie znalazłem publicznego portu `openai-cs-agents-demo` do TypeScript ani dema w TS łączącego: wielu agentów z handoffem, panelu "pod maską", guardrails wejścia i wyjścia, zgody człowieka przy zwrocie, RAG i eval. To wyszukiwanie było ograniczone (WebSearch, bez przeszukania GitHub API), więc brak jest "nie znalazłem", nie "nie istnieje". Zanim opublikujesz, zrób ręczne `gh search repos "openai agents" customer support typescript` i przeszukaj npm.
- Luka jest realna, ale wąska: oficjalne przykłady JS to CLI albo minimalny HITL, a bogate demo to Python. Wartość to **demo referencyjne na jednym stosie TS z widocznym wnętrzem agenta**.
- Pozycjonowanie (propozycje nazw):
  - `agent-inside` / "Agent View: customer-support reference in TypeScript"
  - `support-agent-ts` z podtytułem "multi-agent, guardrails, human approval, evals on @openai/agents"
  - Nazwa musi zawierać TypeScript i coś, czego oryginał nie ma: **approval + eval**. Hasło: "Co zrobiłby produkcyjny agent obsługi klienta: zgoda człowieka, guardraile, eval". Nie nazywać "port"; napisać wprost "inspired by openai-cs-agents-demo".

---

## 4. Gotowość do publikacji

### Licencja i atrybucja

- Oryginał: MIT, "Copyright 2025 OpenAI" (`examples/openai-cs-agents-demo/LICENSE`). MIT pozwala na użycie, ale **wymaga zachowania noty o prawach autorskich i tekstu licencji w kopiach lub istotnych częściach**.
- Portowaliśmy układ i style komponentów UI (komentarz w `app/components/ui/card.tsx:2`: "same look as the OpenAI demo's shadcn cards"; komponenty `agents-list`, `guardrails`, `runner-output`, `conversation-context`, `panel-section` mają te same nazwy co u nich). Zalecenie: **dodać atrybucję** (to bezpieczniejsze; czy sama inspiracja bez kopiowania kodu by wymagała noty, to pytanie prawne, UNVERIFIED).
- Do zrobienia:
  1. `LICENSE` w korzeniu repo (MIT, nasze nazwisko) + plik `NOTICE` lub sekcja w README z nota "Portions of the UI adapted from openai/openai-cs-agents-demo, Copyright 2025 OpenAI, MIT" i pełnym tekstem licencji OpenAI.
  2. Nagłówek w skopiowanych plikach (`app/components/*.tsx` ze wspólnym pochodzeniem).
  3. W README: "Inspired by, not affiliated with OpenAI".
- Brak LICENSE w repo teraz: `ls LICENSE*` nic nie zwraca.

### Konkretne luki

| # | Luka | Gdzie | Co zrobić | Importance | Points |
|---|---|---|---|---|---|
| 1 | Klucz tylko przez password broker z prywatną ścieżką | `justfile:5` (a machine-specific password broker script path), `docs/BUILD-v1.md:123` | Dodać `just dev` czytający zwykły `OPENAI_API_KEY` z env lub `app/.env.local`; broker jako opcjonalny `just dev-broker`. Przenieść prywatną ścieżkę poza repo | High | 2 |
| 2 | Komentarze o brokerze w kodzie i przykładzie | `app/lib/config.ts:3-4`, `app/.env.example:1-2`, `scripts/dev.ps1:1`, `scripts/eval.ps1:1` | Przepisać: "set OPENAI_API_KEY in your environment or app/.env.local" | High | 1 |
| 3 | `.env.example` mówi, że klucza "NEVER stored in a file"; zwykły użytkownik nie ma jak go podać | `app/.env.example` | Dodać `OPENAI_API_KEY=` (puste) | High | 1 |
| 4 | Skrypty tylko PowerShell, justfile ma `windows-shell`, a `corepack pnpm` z `$env:CI='true'` jest składnią PowerShella (na Linux/macOS `just` to nie zadziała) | `justfile:3-34`, `scripts/*.ps1` | Przepisać recepty na sh-kompatybilne (`CI=true pnpm --dir app install`), skrypty `.ps1` zastąpić zapisami w `package.json` (`tsx`, `next dev`) | High | 3 |
| 5 | Zbędny skrypt do backendu Pythona (zależy od `examples/`, które jest w .gitignore) | `scripts/start-python-backend.ps1`, `scripts/smoke-*.mjs` (sprawdzić) | Usunąć lub wyraźnie oznaczyć jako dev-only | Medium | 1 |
| 6 | Brak LICENSE/NOTICE | korzeń repo | Patrz wyżej | High | 1 |
| 7 | README: korzeń krótki i bez uruchomienia; `PREP.md` po polsku, z prywatnymi notatkami; `app/README.md` pisze "INTERVIEW" jako markery | `README.md`, `PREP.md`, `app/README.md` | Angielski README w korzeniu: co to, screenshot, quick start (3 komendy), diagram, tabela "gdzie co", sekcja "Inspired by" i "Limits". `PREP.md` i `docs/JOURNAL.md` przenieść do prywatnego repo lub usunąć z publikacji; markery `// INTERVIEW:` przemianować na `// NOTE:` | High | 3 |
| 8 | Brak screenshotów w repo (`research/*.png` ignorowane) | `.gitignore`, `research/v1-*.png` | Skopiować 2-3 do `docs/img/` (po sprawdzeniu, że nie ma prywatnych danych), wstawić do README, nagrać GIF | High | 2 |
| 9 | Brak CI | brak `.github/` | `.github/workflows/ci.yml`: `pnpm install`, typecheck, lint, test, build (bez eval, bo wymaga klucza) | Medium | 2 |
| 10 | Brak `engines`/wersji Node w `package.json`; `.nvmrc` ma `22` | `app/package.json`, `.nvmrc` | Dodać `engines`; zgodne z wymaganiem Node 22.18+ SDK (z README examples/ai-sdk-ui) | Low | 1 |
| 11 | `private: true`, nazwa pakietu `nordic-home-support-agent`, `.tours/` zależy od VS Code | `app/package.json`, `.tours/` | OK dla repo demo; zdecydować, czy zostawić tour | Low | 1 |
| 12 | Pliki robocze w repo | `app-dev.log`, `backend.log`, `ui.log` w korzeniu (ignorowane przez `*.log`, więc nie w git) | Nic, ale sprawdzić, że nie trafią do paczki | Low | 0 |
| 13 | Dane przykładowe z adresami e-mail | `app/data/customers.json` | Używają `example.com` i fikcyjnych nazw; OK | - | 0 |
| 14 | Nieudokumentowane koszty i modele (gpt-4.1, gpt-4.1-mini, text-embedding-3-small) | `app/lib/config.ts` | Sekcja "Cost" w README (szacunek za scenariusz, UNVERIFIED: nie mierzyłem) | Medium | 1 |
| 15 | Brak ostrzeżenia o bezpieczeństwie (ta sama przeglądarka jest klientem i zatwierdzającym; dane w pamięci) | `app/README.md` "Good to know" ma to częściowo | Przenieść do sekcji "Limits / not production" w głównym README | Medium | 1 |

Suma luk publikacyjnych: ok. 18 pkt (blokery High: #1-#4, #6-#8 = 13 pkt).

## Źródła

- Lokalny kod: `examples/openai-cs-agents-demo/python-backend/airline/*.py`, `python-backend/server.py`, `ui/components/*.tsx`, `ui/components/chatkit-panel.tsx`, `README.md`, `LICENSE`.
- Nasz kod: `app/lib/**`, `app/components/**`, `app/data/scenarios.json`, `justfile`, `README.md`, `PREP.md`, `docs/BUILD-v1.md`.
- https://github.com/openai/openai-cs-agents-demo
- https://github.com/openai/openai-agents-js (oraz katalog `examples`: `customer-service`, `nextjs`, `ai-sdk-ui`)
- https://github.com/Parham-dev/ai-agent-cs
- https://github.com/openai/openai-support-agent-demo
- https://github.com/openai/openai-realtime-agents
- https://openai.github.io/openai-agents-js/guides/handoffs/
- https://openai.github.io/openai-agents-js/guides/human-in-the-loop
- https://pushary.com/nl/human-in-the-loop-openai-agents-sdk
