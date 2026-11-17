# Музыка игры

Файлы отсюда коммитятся и попадают в сборку. Имя файла — ключ трека:

`title`, `level1` … `level9`, `park`, `boss`, `escape`, `ending`;
свой трек босса — `boss-agranovich`, `boss-uralov`, `boss-bordachev`, `boss-mikitko`, `boss-shchelin`,
`boss-duo`, `boss-markov`, `boss-machine` (нет своего — играет `boss`) (`.mp3`, `.ogg` или `.wav`, можно во вложенных папках).

Только своя или лицензированная музыка — треки оригинала Chip 'n Dale сюда не кладём (они только в
`assets/dev-overrides/`, которая в `.gitignore`). Локальная версия из `dev-overrides` при `npm run dev` важнее этой.
