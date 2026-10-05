# ClassSlot

Find a class time that works for every student in a course section. Includes the supplied Fall 2026 V5 timetable: 1,199 students, 96 course codes, and 221 course sections.

## Publish with GitHub Pages

1. Create a GitHub repository, for example `classslot`, with a `main` branch.
2. Extract this ZIP. Put its contents at the root of the repository: `dist/`, `.github/`, `check.mjs`, and this README. Include the `.github` folder; some file managers hide it. Do not upload the ZIP itself or nest everything inside another folder.
3. In the repository, open **Settings > Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open **Actions > Deploy ClassSlot to GitHub Pages > Run workflow**, select `main`, and run it. Future pushes to `main` deploy automatically.
5. When the workflow succeeds, open its deployment URL. For an ordinary project repository it is `https://YOUR-USERNAME.github.io/classslot/`.

If using GitHub's browser upload and the `.github` folder is missing, create `.github/workflows/deploy.yml` with **Add file > Create new file** and paste the supplied workflow into it. Otherwise use GitHub Desktop to commit the complete extracted folder.

This package is ready to deploy, but has not yet been pushed to a GitHub repository or published on GitHub Pages.

## Data visibility

The website loads `dist/data.json` in the browser. That file contains student roll numbers and their timetable associations. Standard GitHub Pages sites are public, and making a source repository private does not by itself make its Pages website private. Confirm that you intend to expose this dataset before publishing. The sign-in protection on the existing ChatGPT-hosted site is not part of this exported code.

## Local use and verification

No installation or build step is required. Serve the `dist` folder over HTTP; opening `index.html` directly as a file may prevent loading the JSON data.

```sh
python -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. With Node.js installed, run the data and overlap checks:

```sh
node check.mjs
```

## What the app does

- Groups every student by their exact course code and section.
- Checks each student's full timetable, including labs spanning multiple slots.
- Shows available slots, student clashes, and the affected roll numbers and courses.
- Supports an additional class or moving one existing meeting.
- When moving a meeting, excludes only that meeting, retaining all other scheduled classes.
- Checks standard timetable start times, with selectable durations. It does not search every possible minute of the day.

Teacher and room availability are not checked. The app suggests times; it does not save rearrangements or send notifications. All times are campus local time. Course titles truncated in the PDF remain truncated; student names were not supplied.

## Files

- `dist/index.html`: interface
- `dist/styles.css`: responsive styles
- `dist/app.js`: interactions
- `dist/engine.mjs`: clash detection
- `dist/data.json`: timetable snapshot
- `check.mjs`: data and overlap verification
- `.github/workflows/deploy.yml`: automatic Pages deployment

Relative asset paths support GitHub project URLs. No credentials, original Git history, or ChatGPT hosting configuration are included.

GitHub's deployment instructions: https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically
