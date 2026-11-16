# Alpine visual assets

Current production revision: **large-flat-brush-v4**. Xinjiang reference supplies subjects/palette/layout; the supplied autumn and aurora game screenshots supply broad stroke scale and grouped value planes.

- `/alpine/assets.html`: Chinese catalog of 12 independently generated PNG assets, plus the distant panorama.
- `assets-v3/manifest.json`: exact prompts for all 12 current asset images. The folder keeps the iteration name; its manifest records the v4 style revision.
- `assets-v3/08-river-gravel.png` and `09-meadow-ground.png`: used by `src/alpine/land.js` for world-fixed color sampling beneath live brush geometry.
- Other asset images are modeling/look-development references. Runtime trees, cows, bus, bench, fence, rocks, grass and water have separate 3D geometry/shaders/collision.
- `mountain-panorama-v4.png`: archived 2172 × 724 concept image, generated with all three user references. Neither v2 nor v4 is loaded by the game now. Runtime mountains are generated in src/alpine/mountains.js as continuous opaque 3D terrain with surface-pinned brush geometry. Prompt in `background-manifest.json`.
- `references/`: unmodified user-provided brush style screenshots.

The 10 isolated v4 PNGs have RGBA channels; the two material images are RGB. They are concept/material images, not rigged GLB or PBR texture sets. Inspect edges and tiling before using them in a different renderer.

## Archived distant background

- reference.png: user-supplied oil painting reference, copied unchanged from the attachment.
- mountain-panorama-v2.png: generated with the built-in image_gen tool using reference.png as the edit/style source on 2026-11-16. This derivative extends the snow range and forest into a wide background. It is a distant matte; playable foreground is 3D geometry.

Production prompt:

Create a production game distant background matte asset by editing/outpainting the attached reference. WIDE landscape 3:2 composition. Preserve EXACT physical impasto oil painting style, chunky palette knife strokes, blue ultramarine shadow snow mountains, warm ivory highlights, saturated blue daytime sky, dark blue-green conifer forests. The upper 70 percent of the reference is the content to preserve. Expand this mountain-and-forest vista naturally left and right into a continuous wide mountain range, without mirroring/repeating peaks and without stretching the original shapes. Central tallest white massif and the diagonal forested slope rising on the right must remain recognisable. Composition: a 12 percent strip of painted sky on top, sculptural snow peaks filling upper 60 percent, and dense deep blue-green forested foothills filling the bottom 30 percent to the entire bottom edge. No foreground meadow, NO road, NO bus, NO cows, NO people, NO buildings, NO typography. This is a continuous distant mountain matte to sit behind actual real-time 3D foreground meadow and animals. Preserve the original artistic treatment and palette precisely; do not make it photorealistic or flat vector art. No atmospheric haze band or frame at the edges. Each mountain must have solid coherent anatomy and bold sculpted broad blue shadow planes and creamy knife-painted snow, not flecks. Output a high-quality wide matte texture.
