# Kid

A small browser-based text-to-video generator.

## What it does

- accepts a text prompt
- turns the prompt into short animated scenes with many keyword-based subjects (`horse`, `pig`, `dog`, `cat`, `bird`, `fish`, `dragon`, `car`, `rocket`, `plane`, `boat`, `robot`, `tree`, `house`, and more)
- detects action words like `run`, `jump`, `fly`, `swim`, `drive`, `spin`, and `dance` to change movement
- previews the result on a 1280×720 canvas
- exports the animation as a `.webm` video

## How to use

1. Start a local server:
   ```bash
   cd /home/runner/work/Kid/Kid
   python3 -m http.server 4173
   ```
2. Open `http://127.0.0.1:4173/index.html` in a modern browser.
3. Enter a prompt, choose style and duration, then click **Generate Preview**.
4. Click **Download Video** to export the animation.

## Prompt examples

- `horse running fast through a field`
- `pig jump in a candy world`
- `dragon fly over mountains`
- `rocket spin in space`
- `robot dance party`
