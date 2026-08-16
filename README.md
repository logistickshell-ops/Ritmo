# Ритмо

Самостоятельный статический исходный пакет Ритмо: ритуалы вместо задач, цикл фокуса и возврата, локальные данные, генеративный аудиофон и PWA-оболочка. В проекте нет сервера, авторизации, базы данных или скрытой аналитики.

## Локальный запуск

```bash
pnpm install
pnpm dev
```

## Проверка и production-сборка

```bash
pnpm check
pnpm build
```

## GitHub

Распакуйте архив, создайте пустой репозиторий и выполните:

```bash
git init
git add .
git commit -m "Initial commit: Ritmo"
git branch -M main
git remote add origin https://github.com/<your-user>/ritmo-adhd.git
git push -u origin main
```

## Render Static Site

Подключите GitHub-репозиторий через **New → Static Site**. Render автоматически увидит `render.yaml`; если потребуется указать настройки вручную, используйте:

| Поле | Значение |
| --- | --- |
| Build Command | `pnpm install --frozen-lockfile && pnpm build` |
| Publish Directory | `dist` |

После первого деплоя открывайте приложение на HTTPS-домене Render. Локальные данные пользователя остаются в его браузере.
