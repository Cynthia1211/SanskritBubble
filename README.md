# Sanskrit Bubble

Sanskrit Bubble is a browser-based learning game. Players aim and fire bubbles representing Sanskrit sounds, match connected groups, and review each lesson's audio.

## Run the Project

From the project root, install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually [http://localhost:5173](http://localhost:5173)).

Other project commands:

```bash
npm run lint      # Run ESLint
npm run build     # Create a production build in dist/
npm run preview   # Preview the production build locally
```

There is currently no automated test script.

## How the Game Works

- Lesson documents are read from the `levels` collection in Firebase Firestore. The app sorts lessons by the number in their ID and uses each document's `level_title` and `bubble_pool` fields.
- A lesson's `bubble_pool` is the source for its board bubbles, shooter queue, sound list, and review card. Each sound should have a stable `id`, a `devanagari` glyph, an `iast` transliteration, and an `audio` path or URL. `description` (or `meaning`) is shown as supporting text. Missing IDs are generated from the lesson ID and item position.
- The board is a staggered 14-column, 10-row grid. A new game fills up to five initial rows, then ensures every sound in the lesson appears at least once. These values and the completion/review bonuses are centralized in `src/game/settings.js`.
- Aim with the left and right arrow keys and fire with Space. The shot follows a calculated path, including wall bounces, and animates to a valid board cell. Once it arrives, matching groups of at least three identical connected sounds pop; unsupported bubbles are then lifted away. A 500 ms pause follows placement before the board settles. The game ends if the bubble pile reaches the danger line, or completes when the board is empty.
- Clearing a lesson awards 50 points. After completion, playing every sound in the review card awards another 50 points once for that lesson. The running score is stored in `sessionStorage` for the current browser tab; there is no account or leaderboard integration.
- Background music and sound effects can be controlled independently. Background music is generated with Tone.js; short interface effects are implemented with the Web Audio API. Lesson audio is played from each sound's `audio` value.

## Firebase Data and Caching

- Firebase is initialized in `src/config/firebase.js`; Firestore and Storage are exported as `levelsDb` and `levelsStorage`. The Firebase client configuration is included in the frontend, so access must be protected with Firebase Security Rules. Do not put privileged server credentials in this file.
- Lesson documents live in the Firebase Firestore `levels` collection. Audio files are stored in Firebase Storage; each sound's `audio` field in Firestore points to its Storage object (usually with a `gs://` path) or to another accessible audio URL.
- `src/services/levelService.js` loads the `levels` collection once per tab and stores the normalized lesson data in `sessionStorage` under `sanskrit-bubble-levels`.
- Audio for a lesson is cached as data URLs in session storage under `sanskrit-bubble-level-audio:<levelId>`. Returning to a lesson in the same tab reuses the cached audio instead of downloading it again. The cache has no time-to-live and is cleared when the tab's session ends. If storage is unavailable or full, audio falls back to its original URL.
- After changing lesson content in Firestore or replacing an audio file at the same URL, open a new tab (or clear the relevant session-storage keys) to see the changes. Existing tabs intentionally keep their cached copy.
- Relative audio paths are resolved against Vite's `BASE_URL`; `http(s):`, `gs://`, `data:`, and `blob:` URLs are treated as already-qualified sources.

## Project Structure

- `src/App.jsx` — page composition, lesson selection, score/review state, and audio controls.
- `src/game/settings.js` — shared board dimensions and score bonuses.
- `src/game/board.js`, `matching.js`, `gravity.js`, `placement.js`, `shot.js` — board creation, connected-group matching, bubble settling, landing-cell selection, and shot trajectory calculations.
- `src/game/useShotController.js` — shot lifecycle, flight state, match resolution, scoring, and next-bubble queue.
- `src/components/BubbleFlight.jsx` — projectile flight animation; `LevelReviewCard.jsx` — completed-lesson audio review UI.
- `src/services/levelService.js` — Firestore lesson loading and per-tab lesson/audio caching.
- `src/hooks/useKeyboardAim.js` — keyboard aim and fire controls.
- `src/assets/Tone.js` and `SoundEffects.js` — background music and generated interface sound effects.
- `src/utils/` — bubble text sizing and review-progress helpers.
- `src/config/firebase.js` — Firebase client initialization.

## Updating Lessons and Assets

- Add or edit lesson documents in the Firebase Console under Firestore Database → `levels`. Keep `bubble_pool` an array and preserve each sound's stable ID when editing existing content; IDs are used to match board bubbles, review progress, and cached audio.
- Upload audio files to Firebase Storage, then set the matching sound's `audio` field in its Firestore document to the Storage `gs://` path. An externally hosted URL or a browser-accessible relative path is also supported. Verify Firebase Storage/Firestore rules and browser CORS settings when audio fails to load.
- Put imported image assets in `src/assets` and import them from the component that uses them. Vite will include imported assets in the build. `vite.config.js` uses a relative base path for GitHub Pages project paths and custom domains.
- After code or data changes, run `npm run lint` and `npm run build`. For deployment, publish the generated `dist/` output using the repository's configured hosting workflow.
