# Mine Build Defeat Movie

[Watch Survive the Night](https://riodebajyoti.github.io/mine-build-defeat-movie/)

A five-hour first-person survival movie with five villagers, two guardians,
smooth camera movement, zombie attacks, weather, music and sound effects.
The story starts on the first morning and ends on the second morning at 05:00:00.
There are 20 chapters; use the timeline to skip ahead or pause at any time.

The movie is scripted and animated in the browser using the original game's
world and models. It is not a recording of an unmodified five-hour play session.
Recurring patrol and combat animations accompany the progressing story.

## Develop and build

```sh
npm ci
npm run build:github
```

The static build is written to `github-dist`. To update this public site,
copy that build into `docs`, then commit it. GitHub Pages serves `main:/docs`.

## Source

- `app/page.tsx`: player, chapters, seeking, volume and fullscreen.
- `public/film/movie.js`: movie direction and synthesized sound.
- `public/film/story.js`: 18,000-second story timeline.
- `public/film/game`: original game modules.
- `public/film/director.js`: shared scene setup and the earlier short-film renderer.

Original game: https://riodebajyoti.github.io/mine_build_defeat/
Original source: https://github.com/riodebajyoti/mine_build_defeat
Original revision: 8648558e326eae51721a785c8c730eaa348fa88d
Game credit: riodebajyoti.

The movie uses Three.js 0.160.0 and webm-muxer 5.1.4; their original library
headers are preserved. Playback and sound are generated in your own browser.
