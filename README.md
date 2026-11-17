# КОМНАТА: Кто украл будущее

Браузерный платформер по подкасту Mash Room. Играть: https://kargobaneks.github.io/mashroom_game/

```sh
npm install
npm run dev      # дев-сервер
npm test         # Vitest
npm run lint     # ESLint
npm run build    # проверка типов + сборка в dist/
npm run levels   # пересобрать карты уровней (src/data/levels/*.json) из scripts/levels/
npm run music    # пересобрать музыку (assets/music/*.ogg) из scripts/music/, нужен ffmpeg
```

Управление: игрок 1 — стрелки, Z прыжок, X действие; игрок 2 — WASD, G прыжок, H действие; Enter — Start; M — звук.
Взять предмет — упереться в него стрелкой и нажать действие. Спрыгнуть с тонкой платформы (стул, стол, подоконник, полка) — ↓ + прыжок или ↓ + действие с пустыми руками.
Геймпады: первый подключённый — игрок 1, второй — игрок 2.

Играбельны все 9 уровней с боссами, финал и титры. Пуш в `main` собирает игру и выкладывает её на GitHub Pages (`.github/workflows/pages.yml`).

Отладка (только `npm run dev`): F1 — неуязвимость, F2 — к арене босса, F3 — выбор уровня, F4 — хитбоксы, F5 — замедление ×0,25, F6 — следующая часть уровня; `?story=N&part=K` — сразу на шаг сценария N, часть K.

Звук: эффекты генерируются в коде (`src/config/sfx.ts`), музыка — `assets/music/` (см. README там). Для разработки их можно подменить своими файлами — см. `assets/dev-overrides/README.md` (в git и прод-сборку не попадают).

Устройство: вся игровая логика — в `src/sim/` (без Phaser, тестируется в Vitest), Phaser только рисует (`src/render/`, `src/scenes/`).
Карты собираются скриптом в формат Tiled JSON — их можно открыть и править в Tiled (тайлсет-заглушка — `assets/tilesets/placeholder.png`).
