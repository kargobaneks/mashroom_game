# Локальные звуки для разработки

Файлы отсюда подхватываются только в `npm run dev`; папка в `.gitignore` и в прод-сборку не попадает.

- `sfx/<ключ>.wav|ogg|mp3` — заменяет сгенерированный звук. Ключи — в `src/config/sfx.ts`.
- `music/<трек>.wav|ogg|mp3` — трек по кругу: `title`, `level1`…`level9`, `park`, `boss`, `escape`, `ending`;
свой трек босса — `boss-agranovich`, `boss-uralov`, `boss-bordachev`, `boss-mikitko`, `boss-shchelin`,
`boss-duo`, `boss-markov`, `boss-machine` (нет своего — играет `boss`).
- Можно во вложенных папках (`music/что-угодно/level1.mp3`). Файлы с другими именами игнорируются.
- После добавления файла перезапусти `npm run dev` (Vite видит новые файлы при старте).

Музыка для репозитория — в `assets/music/` (см. README там); локальный файл отсюда важнее.
