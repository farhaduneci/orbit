# Orbit

No-build static page: `index.html`, `style.css`, `orbit.js`. Content lives in JSON, never in code.

This repo is the public template: only app code, docs and placeholder `template/` content. A live personal site is a separate private repo that adds this one as a submodule next to its own `data/`.

## Rules

- Nothing personal here: no real people's photos or notes, no owner name, handle, domain or deploy route. `data/` stays git-ignored. Examples go in `template/` with placeholder art.
- Small logical commits, stage only touched paths, push each. Never commit secrets.
- Motion: transform and opacity only, ease-out, under 300ms for UI, gate hover with `(hover: hover)`, honor `prefers-reduced-motion`.
- Keep focus-visible parity with hover. Items must stay keyboard reachable.
- Docs: concise, neutral voice, no personal names.
