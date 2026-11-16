# Oil paint integration

This project starts from [blendi/oil-paint](https://patch.gg/blendi/oil-paint), release **1.1.3**, commit `804c65f`.
The complete renderer, both demo worlds, character assets, and license notices are included locally.

## Run locally

```powershell
pnpm install --frozen-lockfile
pnpm run dev
```

Open <http://127.0.0.1:5406/>. The default scene is Aurora; use the corner buttons to switch to Autumn wood.
For a production build, run `pnpm run build`, then `pnpm run serve` and open <http://127.0.0.1:5405/>.

## Controls and settings

The project API's `latest_release.block` was checked on 2026-11-16:

```json
{ "presets": [], "controls": [], "triggers": [] }
```

This release publishes no recipe controls, ranges, defaults, presets, or triggers. The original visual and movement settings are retained.
`recipe.json` is the local recipe used by both scene entry points.

- Click the scene to look with the mouse; Escape releases the pointer.
- WASD / arrow keys move; Shift sprints; Space jumps.
- The wheel adjusts camera distance; H toggles the hint.
- V toggles first person in Aurora. Gamepad input is also included.

Source-supported URL options, separate from recipe controls:

| Option | Behavior |
| --- | --- |
| `?scene=aurora` | Snow ridge and cabin; default scene |
| `?scene=autumn` | Autumn forest |
| `?quality=low` | Reduced rendering workload |
| `?canvas=0` | Disable the canvas finish |
| `?impasto=0` | Disable raised-paint shading; source documents values from 0 to 2 |
| `?scene=autumn&shafts=0` | Disable sun shafts in the forest |

To build another world with this renderer, use the example in `README.md` and the exports in `src/oilpaint/index.js`.
Scene selection lives in `src/scenes.js`; scene setup lives in `src/night/main.js` and `src/main.js`.

Code is MIT; art is CC0. See `LICENSE` and `LICENCE-NOTES.md` for included third-party notices.

## Verification

`pnpm-lock.yaml` was imported from the upstream npm lockfile for repeatable installation with pnpm.
The production build passed. Headless Chrome checks passed for switching Aurora → Autumn wood → Aurora,
movement, wheel zoom, hint toggling, and WebGL2 in both scenes, with no JavaScript runtime errors.
Local screenshots are saved in `shots/local-aurora.png` and `shots/local-autumn.png` (ignored by Git).
