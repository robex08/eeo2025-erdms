---
name: erdms-app-git
description: Git záloha aplikace v /var/www/erdms-dev/apps – nová aplikace dostane vlastní repo v erdms-apps s větví <app>/develop. Použij, když uživatel chce "git zálohovat", "dát do gitu", "založit repo" pro projekt v apps/, nebo převést existující aplikaci z kořenového repa.
---

# Git pro aplikace v `/var/www/erdms-dev/apps`

**Pravidlo:** každá aplikace `apps/<app>` = samostatné git repo, remote `erdms-apps`
(`git@github-erdms-apps:robex08/erdms-apps.git`), jediná větev **`<app>/develop`** = hlavní větev pro push.
Kořenové repo (`eeo2025-erdms`, `feature/v3-development`) aplikace nesleduje – jsou v jeho `.gitignore`.
Výjimka: `dashboard/` + `auth-api/` v kořeni → větev `erdms-dashboard/develop`, git přes `dashgit` (viz CLAUDE.md).

Nová aplikace se do gitu **nepřidává automaticky** – až když uživatel řekne, že ji chce zálohovat.

## Nová aplikace (bez historie v kořenovém repu)
1. Kontrola (nic nemění): `/root/erdms-git-hooks/erdms-new-app <app>`
   – ověří, že větev `<app>/develop` v erdms-apps neexistuje, že ji kořen nesleduje, vypíše citlivé soubory (`.env*`, klíče, dumpy) a možná hesla.
2. Ukázat výsledek uživateli; pokud jsou nalezena hesla v kódu → upozornit, **nepushovat**, dokud se nevyřeší.
3. Po potvrzení: `/root/erdms-git-hooks/erdms-new-app <app> --push`
   – záloha tar do `/home/erdms_zalohy/root/`, `.gitignore` (pokud chybí), `git init -b <app>/develop`,
   `erdms.app` + `core.hooksPath`, první commit, `push -u`, kořenový `.gitignore` + `erdms.splitApp`.
4. Doplnit řádek do tabulky v `/var/www/erdms-dev/CLAUDE.md` a commitnout kořen (`.gitignore`, `CLAUDE.md`) do `feature/v3-development`.
5. Ověřit: `git -C apps/<app> status -sb` → `## <app>/develop...origin/<app>/develop`, čisté.

## Převod aplikace, kterou kořen už sleduje (s historií)
Skript to odmítne – postup ručně (viz CLAUDE.md „Převod další aplikace“):
záloha tar → `git subtree split --prefix=apps/<app>` → push do `<app>/develop` → v `apps/<app>`: `git init`, remote,
`git reset origin/<app>/develop` (nikdy `--hard`), `.gitignore` → `git config erdms.app <app>` + `core.hooksPath`
→ v kořeni `git rm -r --cached apps/<app>`, `.gitignore`, `git config --add erdms.splitApp <app>`.

## Běžná práce
- Git vždy ve složce aplikace (`git -C apps/<app> …`), nikdy nepřepínat větev.
- Před pushem: `git rev-parse --show-toplevel`, `branch --show-current`, `remote -v`.
- Pre-push hook `/root/erdms-git-hooks/pre-push` pustí aplikaci jen do `<app>/*` v erdms-apps.
- Nikdy necommitovat `.env*`, klíče, DB dumpy, `.claude/settings*.json` (mohou obsahovat hesla).
