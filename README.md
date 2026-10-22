# Sanskrit Bubble

Sanskrit Bubble is a browser-based learning game. Players aim and fire bubbles representing Sanskrit sounds, match connected groups, and review each level's audio.

## Run the Project

From the project root, install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually [http://localhost:5173](http://localhost:5173)).

## How the Game Works

- Lesson documents are read from the `levels` collection in Firebase Firestore. The app sorts levels by the number in their ID and uses each document's `level_title` and `bubble_pool` fields.
- Initial board bubble count, board dimensions, fill settings, and score bonuses can be configured in `src/game/settings.js`.
- The game supports keyboard controls and pointer dragging, including touch-screen aim and release-to-fire input.
- The running score is stored in `sessionStorage` and is cleared when the page session ends. There is no account or leaderboard integration.

## Updating Lessons and Assets

- Add or edit level documents in Firestore under the `levels` collection. Keep `bubble_pool` as an array and preserve stable sound IDs.
- Upload level audio to Firebase Storage and reference it from the sound's `audio` field. External URLs and relative paths are also supported.
- Keep each level to 6 sounds or fewer when possible. The app has 10 preset colors, so colors repeat after 10 sounds.

## Project Structure

- `src/App.jsx` — main page composition, level state, score, review, and controls.
- `src/game/` — board setup, placement, matching, gravity, shot calculation, and shot state.
- `src/components/` — projectile animation and completed-level review UI.
- `src/services/levelService.js` — level loading and audio caching.
- `src/hooks/` — keyboard, mouse, and touch controls.
- `src/game/settings.js` — board and scoring configuration.
- `src/assets/` — audio behavior and image assets; `src/utils/` — shared helpers.
- `src/config/firebase.js` — Firebase client initialization.

## Firebase Data and Caching

- Firebase is initialized in `src/config/firebase.js`, which exports Firestore and Storage clients for level data and audio.
- Lesson data is loaded from the Firestore `levels` collection and cached per browser tab in `sessionStorage`.
- Lesson audio is cached as data URLs per level. If caching fails, the original audio URL is used.
- The cache lasts for the current tab session. After changing level data or replacing audio at the same URL, open a new tab or clear the relevant session-storage keys.
- Firebase client settings are public frontend configuration; protect access with Firebase Security Rules and do not add server credentials.

## Responsive Design

- Supports different layouts for large, medium, and small screens.
- Desktop users can control the game with the keyboard and mouse.
- Touch-screen users can slide to aim and release to fire.


