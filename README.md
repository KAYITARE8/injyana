# Injyana - your melody, anywhere

Multi-user audio platform. Node.js + Express + PostgreSQL backend, installable PWA frontend
(Windows, macOS, iOS, Android, any screen size), dark mode by default.

## Run it locally
1. Install and start PostgreSQL locally, then make sure the database and user in `DATABASE_URL` in `.env` exist.
2. `npm install`
3. `npm start`  -> http://localhost:3000   (tables are created automatically)
4. `npm test`   (runs server input and Audius mapping tests)

Docker is optional. To start the bundled PostgreSQL container instead, run
`docker compose --profile docker up -d`.

`.env` is already filled in for local use. It is git-ignored: never commit it.

## What it does
- **Accounts**: public sign-up, bcrypt-hashed passwords, JWT in an httpOnly cookie, rate-limited auth routes. Each account has its own library and playlists.
- **Search + play**: search and stream available tracks through the official Audius API. The Audius API key stays on the server.
- **Playback controls**: shuffle the current queue and cycle repeat between off, all, and the current track.
- **Trending**: browse this week's trending Audius songs, artists, albums/EPs, and playlists by genre.
- **Uploads**: upload your own audio files; they are stored in `uploads/` per user and streamed while online.
- **Library, favorites, playlists**: stored in PostgreSQL and synced across devices. Favorite and playlist edits made offline are queued for reconnection.
- **Your week**: an account-only rolling playlist of tracks you meaningfully listened to in the past seven days, grouped around your most-played artists and genres. Listening history is private to your account and older entries are pruned as you use the feature.
- **Look**: blurred background photo on every page (`public/assets/bg.jpg`, pre-blurred), logo from
  `public/assets/logo.png`, the word **ek** and the copyright line beneath the content of every page.

## Deploy (Render)
1. Publish this project to a GitHub repository. `.env` and uploaded audio are excluded by `.gitignore`.
2. Create a PostgreSQL project on Supabase Free and copy its connection string from the project dashboard.
3. In Render, create a Blueprint from the repository root. `render.yaml` configures a free web service and prompts for the Supabase `DATABASE_URL`; Render generates `JWT_SECRET`. The Audius API key is optional.
4. The Render Free service uses temporary local storage for uploads. Uploaded audio can disappear whenever the service restarts or is redeployed. Use persistent object storage (for example, a private R2 bucket) before relying on uploads. Local development uses `uploads/` unless `UPLOAD_STORAGE=r2` is set.

The free web service may sleep when idle. The Supabase Free database has plan limits and may pause after inactivity; check current provider limits and enable backups before opening sign-ups publicly. Never add provider credentials to the repository.

## Notes
- Audius playback and uploads need an internet connection. Only stream tracks the Audius API marks as available and streamable. Respect Audius API terms and creator rights; this app does not download Audius tracks.
- Search results are cached for 10 minutes, with a server-side timeout and bounded in-memory cache.
- Existing YouTube library entries are retained as legacy records after upgrade, but are no longer playable; users can remove them from their library.
- Keep `AUDIUS_API_KEY` and `JWT_SECRET` in deployment secrets, never in source control. Rotate credentials if exposed.
