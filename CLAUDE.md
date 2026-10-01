# erdms-dev – pravidla pro git (POVINNÉ)

Každá aplikace v `apps/<app>` je **samostatné git repo** (vlastní `.git`) – klon GitHub repa
`robex08/erdms-apps`, kde má každá aplikace vlastní větev `<app>/develop`.
Kořen `/var/www/erdms-dev` je repo `robex08/eeo2025-erdms` (docs, dashboard, auth-api, ostatní apps).

| Složka | Repo (remote) | Větev |
|---|---|---|
| `apps/eeo-v2` | erdms-apps (`git@github-erdms-apps:robex08/erdms-apps.git`) | `eeo-v2/develop` |
| `apps/vehicles` | erdms-apps | `vehicles/develop` |
| `apps/burza-sluzby` | erdms-apps | `burza-sluzby/develop` |
| `apps/inventik` | erdms-apps | `inventik/develop` |
| `apps/intranet-v26` | erdms-apps | `intranet-v26/develop` |
| kořen + ostatní `apps/*` | eeo2025-erdms (`git@github.com:robex08/eeo2025-erdms.git`) | `feature/v3-development` |

## Pravidla
- Git příkazy pro aplikaci spouštěj **vždy v její složce** (`git -C apps/<app> ...`), nikdy z kořene.
- **Nikdy nepřepínej větev** (`git checkout/switch`) v kořeni ani v aplikacích – každá složka má svou větev napevno.
- Push aplikace jde jen do `erdms-apps` a jen do větví `<app>/*`.
- Kořenové repo nesmí obsahovat soubory aplikací s vlastním repem (`apps/eeo-v2`, `apps/vehicles` jsou v `.gitignore`).
- Před pushem vždy ověř `git rev-parse --show-toplevel`, `git branch --show-current` a `git remote -v`;
  pokud nesedí s tabulkou, **zastav se a upozorni uživatele**.

## Příkaz „workspace <app>“
Když uživatel napíše `workspace <app>` (např. `workspace vehicles`, `workspace eeo-v2`, `workspace root`):
1. Ověř (jen čtení) `apps/<app>`: `git -C apps/<app> rev-parse --show-toplevel`, `branch --show-current`,
   `remote get-url origin`, `status -sb` (necommitnuté změny, ahead/behind).
2. Vypiš krátce: složka, repo, aktuální větev, očekávaná větev `<app>/develop`, stav. Neznámý `<app>` → nabídni seznam z tabulky.
3. **Zeptej se na potvrzení** (AskUserQuestion). Bez potvrzení nic neměň.
4. Po potvrzení: pracuj jen v `apps/<app>` (soubory i git přes `git -C apps/<app>`), dokud uživatel nezmění workspace.
   Pokud větev ≠ `<app>/develop`, nabídni přepnutí (`git -C apps/<app> switch <app>/develop`) – jen po dalším potvrzení,
   a nikdy při necommitnutých změnách (nejdřív upozorni).
5. Na začátku každé odpovědi s git operací uveď aktivní workspace; operace mimo něj → upozorni a zeptej se.

## Ochrana
Pre-push hook `/root/erdms-git-hooks/pre-push` (nastaven přes `core.hooksPath` + `git config erdms.app <app|root>`)
blokuje push do cizí větve/repa. Obejít jen na výslovný pokyn uživatele: `ERDMS_PUSH_FORCE=1 git push`.

## Převod další aplikace do erdms-apps
záloha (tar do `/home/erdms_zalohy/root/`) → `git subtree split --prefix=apps/<app>` → push do `<app>/develop`
→ v `apps/<app>`: `git init`, remote, `git reset origin/<app>/develop`, vlastní `.gitignore` (kopie kořenového)
→ `git config erdms.app <app>` + `core.hooksPath` → v kořeni `git rm -r --cached apps/<app>`, `.gitignore`,
`git config --add erdms.splitApp <app>`.
