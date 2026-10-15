# ExamFlow — Telegram Mini App launch notes

Public build: **https://ximeexd.github.io/examflow/**

The app is a static site. Telegram is the host shell: progress persists in
Telegram **CloudStorage**, bound to this bot and this user — there are no
custom backend or Supabase requests; progress is sent through Telegram
CloudStorage only.

## BotFather setup (Menu Button)

No token and no server configuration is needed — these are UI steps in the
BotFather chat only:

1. Open `@BotFather` → `/mybots` → pick the bot.
2. **Bot Settings → Menu Button → Configure/Edit menu button URL**.
3. Enter `https://ximeexd.github.io/examflow/` and a button label (e.g.
   «Открыть ExamFlow»).
4. Open the bot in Telegram and tap the menu button — the app launches with
   `initData` and CloudStorage available.

`/newapp` (Mini App) additionally gives a `t.me/<bot>/<app>` link; the Menu
Button is enough for launch.

## Manual smoke checklist (iOS + Android + desktop)

- [ ] First launch: branded loading overlay appears, then onboarding runs
      (exam → subjects → daily goal) and the home page renders.
- [ ] Finish a real lesson end-to-end; XP/coins update; the sync chip reaches
      «Сохранено в Telegram» before closing.
- [ ] Close the mini app and reopen: progress, streak and settings restored.
- [ ] Second device (same Telegram account): progress restores from the cloud.
- [ ] Airplane mode / no network: change something, confirm an honest status
      message (not a fake «saved»); reopen with network — progress arrives.
- [ ] Telegram **BackButton**: lesson → tasks, tasks/quests/profile → home,
      profile with an open sheet closes the sheet first.
- [ ] Safe areas: header/nav/sheets are not covered by the notch, status bar or
      Telegram chrome; page scrolls at 320×568 including onboarding.
- [ ] Backdrop/header colors match the cream theme; app is expanded.
- [ ] Second device used only after «Сохранено в Telegram» — never two
      devices editing concurrently.

## Multi-device use

CloudStorage has no transactions, so concurrent writes from two devices can
lose changes. Detected conflicts are not silently overwritten — the app asks
you to choose which version to keep. Still, treat it as one active device at a
time: switch only after «Сохранено в Telegram» is shown.

## Known limitations (state honestly — do not oversell)

- No anti-cheat backend: XP/coins are personal motivation, not verified results.
- No server-side validation of answers or progress.
- Browser-link use is a separate local demo (localStorage), not synced.
- Content has not passed a formal educational/answer audit or legal review;
  there is no privacy policy or support contact published yet.
- The partial content audit found remaining course-coverage and exam-format
  gaps, especially pre-20th-century EGE history. See `CONTENT_AUDIT.md` before
  presenting the app as a complete exam-preparation course.
