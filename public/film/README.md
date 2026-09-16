# Survive the Night — local five-hour movie

The requested version is a local movie player, animated live with sound.
It is not a five-hour MP4. The story begins on the first morning and ends
on the second morning at exactly 05:00:00 of active playback.

## Watch

Run `npm install` once if dependencies are missing, then `npm run dev`.
Open the local address printed by the server and choose Begin the movie.
Use pause, the timeline, chapter buttons, volume, or fullscreen.
The 20 chapters are each 15 minutes. The movie stops at five hours.
If the browser blocks sound, click Enable sound inside the movie.

## What is included

- Original Mine Build Defeat terrain, buildings, villagers, guardians,
  zombies, item artwork, held-item appearance, and weather modules.
- Smooth first-person camera motion and procedural combat scenes.
- Five villagers, two iron guardians, a storm and a low-health survival arc.
- Locally synthesized music, wind, birds, rain, thunder, steps and impacts.
- Beginning in daylight, a full night, second-morning ending and credits.

This is a scripted, procedurally animated movie. It does not represent a
recorded five-hour unmodified gameplay session. Actions, health, enemy
waves, chapter dialogue, and time of day are directed. Continuous patrol
and combat animations recur as the story advances; it is not a five-minute
video replayed on a loop. The player does not record or upload your gameplay.

## Code

- app/page.tsx — local player controls, chapters, sound and fullscreen.
- public/film/movie.js — five-hour animation, village, combat, live soundtrack.
- public/film/story.js — 18,000-second timeline and 20 story chapters.
- public/film/director.js — shared scene and rendering setup; also retains
  the earlier five-minute renderer used during development.
- public/film/game — original game modules.
- public/film/villagers.js — villager geometry adapted from the original game.

Original game: https://riodebajyoti.github.io/mine_build_defeat/
Original repository: https://github.com/riodebajyoti/mine_build_defeat
Source revision: 8648558e326eae51721a785c8c730eaa348fa88d
Game credit: riodebajyoti.

Vendor libraries: Three.js 0.160.0 and webm-muxer 5.1.4. Their license
notices are preserved. The local website uses the Sites React/Vinext starter.

Nothing has been published. All playback and sound generation stay local.
