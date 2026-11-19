# H06 — wykonanie i weryfikacja

Wykonano cztery punkty handoffu, każdy w osobnym commicie. Nie uruchamiano
`just eval`, nie wykonywano push ani wywołań modelu. Zmiany w `.tours/` dotyczą
wyłącznie punktu 4. Raport jest osobnym, piątym commitem. Końcowy przegląd
numerowanych źródeł skorygował jeszcze trzy odnośniki w opisach punktu 4:
`useInspectorChannel` jest w linii 121, części tekstu w `route.ts` w liniach
79–81, a adres śladu w `turn.ts` w linii 84. Korekta ma osobny commit;
checker po niej ponownie przeszedł wszystkie 23 kotwice.

## Zmiany

| Punkt | Wykonane | Wynik | Commit |
|---|---|---|---|
| 1 | Tak | Pełny IBAN, ze spacjami i bez, jest nadal sprawdzany w całym logu. Krótkie grupy cyfr są sprawdzane w wyświetlanym statusie `sensitive_stored`, bez losowych UUID. Odpowiedź HTTP również nadal nie może zawierać `1090`. | `58e25a0` |
| 2 | Tak | Smoke przewija menu do końca, czeka na usunięcie dolnego gradientu i sprawdza pozostawienie górnego. | `4e5945f` |
| 3 | Tak | Ponowny zrzut 768×844 z kursorem w `(0, 0)`, poza panelem. Skrypt zachowuje tę pozycję przy kolejnych zrzutach. | `0fccd90` |
| 4 | Tak | Sprawdzone wszystkie 21 dotychczasowych kotwic i numery linii w opisach; dodane dwa polskie kroki, po jednym dla selektora śladu tury i zakładek workspace. Każdy z 23 kroków ma `pattern`; checker jest częścią `just check`. | `79a0c4a` |

Opis CodeTour uwzględnia oddzielny kanał inspektora, decyzje w zakładce Consultant,
przekierowanie `/admin`, jawną mapę odbiorców zdarzeń oraz aktualną weryfikację
gościa: obowiązkowy e-mail, opcjonalny kod pocztowy i dwa limity prób.

## Weryfikacja

| Sprawdzenie | Wykonane | Wynik |
|---|---|---|
| `corepack pnpm --dir app test tests/sensitive-data.test.ts`, 20 uruchomień | Tak | PASS; każde uruchomienie: 17/17 testów, kod 0; cała pętla: kod 0. |
| `just check` z `CI=true` | Tak | PASS, kod 0: typecheck, ESLint, 39 plików / 341 testów i checker 23 kotwic. |
| `node scripts/check-tour.mjs` po końcowych poprawkach opisów | Tak | PASS, kod 0: 23 kotwice. |
| Negatywna próba checkera: linia 999999 | Tak | Oczekiwany FAIL, kod 1: linia poza zakresem 1–147. |
| Negatywna próba checkera: nieobecny wzorzec | Tak | Oczekiwany FAIL, kod 1: linia 109 nie zawiera wzorca. |
| `just build` z `CI=true` | Tak | PASS, kod 0: zoptymalizowany build Next.js, wygenerowane 8/8 stron. |
| `restart the server` | Tak | PASS, kod 0: `agent-demo: running`. Końcowy odczyt your process manager: running, ready=true, live=true. |
| Layout smoke po buildzie i restarcie | Tak | PASS, kod 0 na `http://127.0.0.1:3100/` przez wymagany PROXY_PAC; brak kart błędów i nieoczekiwanych błędów konsoli. |
| Oględziny ponownego zrzutu Runner Output | Tak | Brak stanu hover; widoczne i czytelne oba wiersze, bez ucięcia. |
| `git diff --check` | Tak | PASS, kod 0. |

Artefakty udanego buildu zaobserwowano w
`agent-demo/app/.next/BUILD_ID` i `agent-demo/app/.next/server/app/page.js`.
your process manager uruchamia aplikację z `agent-demo/app`. Zachowany zrzut:
[agent-demo/docs/screenshots/h05-runner-768.png](../../docs/screenshots/h05-runner-768.png).

Końcowy smoke:

```powershell
$env:PROXY_PAC='<your proxy PAC, if any>'
node scripts/smoke-v1.mjs http://127.0.0.1:3100/ --layout
```

Nowa asercja gradientu przeszła przy 1440, 390 i 768 px. Pozostałe zrzuty
nadpisane przez pełny smoke przywrócono do ich zapisanych wersji; commit punktu 3
zmienia tylko wskazany zrzut i pozycję kursora w funkcji jego przechwytywania.

## Wynik pętli testu

```text
PASS sensitive-data iteration 1/20
PASS sensitive-data iteration 2/20
PASS sensitive-data iteration 3/20
PASS sensitive-data iteration 4/20
PASS sensitive-data iteration 5/20
PASS sensitive-data iteration 6/20
PASS sensitive-data iteration 7/20
PASS sensitive-data iteration 8/20
PASS sensitive-data iteration 9/20
PASS sensitive-data iteration 10/20
PASS sensitive-data iteration 11/20
PASS sensitive-data iteration 12/20
PASS sensitive-data iteration 13/20
PASS sensitive-data iteration 14/20
PASS sensitive-data iteration 15/20
PASS sensitive-data iteration 16/20
PASS sensitive-data iteration 17/20
PASS sensitive-data iteration 18/20
PASS sensitive-data iteration 19/20
PASS sensitive-data iteration 20/20
```

## Ograniczenia i wcześniejsze niepowodzenia

- NOT_CHECKED: przepływy wymagające modelu — odpowiedzi czatu, akceptacja/wznowienie
  z modelem, KB, weryfikacja gościa, reklamacje i zmiana adresu. Konto nie ma kredytów;
  ograniczenie handoffu zostało zachowane. Testy jednostkowe działają bez modelu.
- Nie uruchamiano CodeTour w rozszerzeniu edytora. Kotwice sprawdził checker,
  a opisy i wskazane fragmenty kodu zostały odczytane ze źródeł.
- Pierwszy zapis był odrzucony przez hook dzierżawy; po zwolnieniu jej przez
  koordynatora uzyskano własną dzierżawę. Wygasające dzierżawy odnawiano wymaganym
  poleceniem, bez przejmowania cudzej aktywnej blokady.
- Pierwsza próba pętli testów zakończyła się kodem 1 przed testami: Vite zgłosił
  `spawn EPERM`. Uruchomienie poza sandboxem po eskalacji przeszło 20/20.
- Hook odrzucił przekierowanie wyniku do ścieżki ze zmienną środowiskową jako
  nierozpoznany cel zapisu. Pętlę wykonano bez przekierowania, z widocznym wynikiem.
- Pierwsza pomocnicza próba negatywna checkera nie uruchomiła procesu potomnego
  w sandboxie; pomocnik zgłosił `ERR_INVALID_ARG_TYPE` przy pustym wyniku procesu.
  Plik tour przywrócił blok `finally`. Po eskalacji obie próby dały oczekiwany kod 1,
  a odtworzony tour ponownie przeszedł checker z kodem 0.
- Sandbox odmawiał także zapisu `.git/index.lock` i jednego odczytu pipe your process manager.
  Wymagane operacje wykonano po eskalacji; nie zmieniano uprawnień ani narzędzi.

Następny krok przeglądu: otworzyć CodeTour w edytorze i przejść dwa nowe kroki,
korzystając z powyższych wyników jako dowodu zgodności kotwic ze źródłami.
