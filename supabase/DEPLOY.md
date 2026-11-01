# ExamFlow — деплой серверного античита (Supabase)

Схема: **Supabase = источник истины** по экономике (XP, монеты, прогресс тем,
квесты, серия). Браузер показывает мгновенные оптимистичные награды, но
долговременное состояние пишет только Edge Function `examflow-api` после
проверки ответов по `answer_keys` и правил прогрессии.

CloudStorage/локальное состояние остаётся кэшем, офлайн-режимом и источником
одноразовой миграции.

## 1. Миграции БД (SQL Editor, по порядку)

1. `supabase/anticheat.sql` — таблицы `players`, `curriculum_topics`,
   `answer_keys`, `events` + RLS (revoke all: пишет только service role).
2. `supabase/anticheat_data.sql` — 520 строк учебного плана + 23 000 ключей
   ответов (генерируется `D:\ExamFlow_design_evidence\export_server_data.py`).

Проверка после заливки:

```sql
select count(*) from answer_keys;            -- 23000
select count(*) from curriculum_topics;      -- 520
select exam, subject, count(*) from answer_keys group by 1,2 order by 1,2;
```

## 2. Секреты функции (Supabase Dashboard → Edge Functions → Secrets)

| Секрет | Значение |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен бота из @BotFather (только HMAC-ключ, наружу не уходит) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key проекта (Dashboard → Settings → API) |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `APP_ORIGINS` | `https://ximeexd.github.io` (через запятую, без пробелов, при добавлении домена — дописать) |

## 3. Деплой функции

```
supabase functions deploy examflow-api --no-verify-jwt
```

`--no-verify-jwt` обязателен: функция использует собственные HMAC-сессии,
а не Supabase JWT — без флага шлюз отклонит запросы до кода.

Через Dashboard (без CLI): Edge Functions → Deploy new function → имя
`examflow-api` → вставить целиком `index.ts` в единственный файл → Deploy.
Файл самодостаточен — валидация Telegram встроена в него же.

## 4. Клиент

В `server-sync.js` заменить `PROJECT_REF` на ref проекта:

```js
const API = window.EF_SERVER_API || 'https://<ref>.supabase.co/functions/v1/examflow-api';
```

CSP уже пропускает `connect-src https://*.supabase.co`.

## 5. Проверка живого контура (Telegram)

1. Открыть мини-приложение из бота → статус «защищённый режим».
2. Пройти урок → XP на экране совпадает с серверным (оверлей корректирует).
3. Повтор того же события → `skipped`, двойного начисления нет.
4. Закрыть/открыть с другого устройства → прогресс тот же.
5. Подменить ответ/XP через DevTools → сервер считает сам, локальное
   значение перезаписывается оверлеем.

## Что защищено / что нет

- Ответы проверяются на сервере, XP начисляет только сервер, события
  идемпотентны, есть порог длительности урока, порядок разблокировки тем,
  дневной лимит XP (1200) и практики (40/день).
- Время урока клиентское — флор 15 с отсекает мгновенный спам, но
  «зажать» таймер можно; это принятый компромисс без heartbeat-сессий.
- Тела вопросов в «работе над ошибками» живут локально: на новом
  устройстве список ошибок пуст до первых неверных ответов там.
- `telegram-auth` (старая функция) не нужна для этой схемы — `examflow-api`
  валидирует `initData` сам и не использует Supabase Auth.

## Напоминания

Ежедневные пуши в Telegram (в стиле Duolingo): Edge Function
`examflow-remind` + pg_cron, ходит в `sendMessage` ботом по `telegram_id`
(= id личного чата).

1. SQL Editor: `supabase/reminders.sql` — добавляет `last_reminded_on`,
   `remind_blocked` в `players` + внутри закомментированный сниппет pg_cron.
2. Секреты (Edge Functions → Secrets):
   - `CRON_SECRET` — длинная случайная строка; функция требует её в заголовке
     `x-cron-secret`, без неё — 401.
   - `TELEGRAM_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` — те же,
     что у `examflow-api`.
3. Деплой:
   ```
   supabase functions deploy examflow-remind --no-verify-jwt
   ```
   Через Dashboard — два файла: `index.ts` и `due.ts` (логика выбора).
4. Расписание — выполнить закомментированный сниппет из `reminders.sql`:
   включить `pg_cron` + `pg_net`, `cron.schedule('examflow-remind', '*/10 * * * *', …)`
   с тем же `x-cron-secret`.
5. Логика: шлём, когда локальное время игрока (`settings.tz`, минуты от UTC,
   присылает клиент; дефолт UTC+3) ≥ `settings.time` и прошло < 3ч; один раз в
   день (`last_reminded_on`), и только если сегодня ещё не занимался
   (`econ.lastActive`). Кнопка «Начать занятие» — web_app на сайт;
   «Настроить напоминания» — web_app на `profile.html?settings=1`
   (открывает блок «Настройки» со скроллом к нему).

Ограничение: сообщение получит только тот, кто нажимал Start в боте. Мини-
приложение, открытое через кнопку меню без `/start`, может ответить 403 —
тогда ставим `remind_blocked=true` и снимаем его при следующем `auth`
(пользователь открыл приложение = чат жив).
