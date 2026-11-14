# Videos de IA de Bolsillo

Videos de los reels y la cola de publicación. GitHub Actions corre `publicar.mjs` cada 10 minutos y publica en
Instagram los reels de `cola.json` cuya hora ya pasó (Instagram baja el mp4 de GitHub Pages).

Para programar uno: subir el `.mp4`, su caption en `captions/` y sumar una fila a `cola.json` con `"estado": "pendiente"`.
GitHub puede atrasar las corridas programadas unos minutos (a veces más de 15).
