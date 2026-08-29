# Focus Flow

A Pomodoro timer with a task list that remembers you. No build step, no
dependencies — just open it in a browser.

## Features

- **Pomodoro timer** with Focus, Short Break, and Long Break modes, plus a
  round counter (long break kicks in after every 4th focus session).
- **Task list** — add tasks, check them off, remove them. Persists across
  reloads.
- **Custom session lengths** and a sound on/off toggle, tucked under
  ⚙ Settings.
- **Keyboard shortcut** — press <kbd>Space</kbd> to start/pause the timer
  (when not typing in a text field).
- Everything is saved to `localStorage`, so your tasks, stats, and settings
  are still there the next time you open the page.

## Running it locally

No install or build required — just open `index.html` in your browser:

```bash
open index.html   # macOS
start index.html  # Windows
```

Or serve the folder with any static file server, e.g.:

```bash
npx serve .
```

## Project structure

| File         | Purpose                              |
| ------------ | ------------------------------------- |
| `index.html` | App markup                            |
| `style.css`  | Styling                               |
| `script.js`  | Timer logic, task list, persistence   |
