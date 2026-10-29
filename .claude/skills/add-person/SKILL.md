---
name: add-person
description: Add a person, channel, book or tool to the Orbit, or change an item's links. Use when asked to add someone/something to an orbit or ring, or to add, swap or fix a link.
---

# Add a person or link

Content lives in `data/people.json` and `data/photos/`. Field reference: README `people.json` table.

## Steps

1. **Decide: new item or new link.** A different person, channel or brand is a new item, even when it shares an orbit with an existing one. A link goes on an existing item only when it is that same entity's other home (site plus its own channel). Only `links[0]` opens on click; extra links are unused. Done when the choice is clear; ask if it is not.
2. **Photo.** Save a square image as `data/photos/<kebab-name>.jpg`, resized to 320px (`sips -Z 320`). YouTube avatar: the `og:image` of the channel page. Done when the file opens as an image.
3. **Item.** Insert into `items[]` next to its ring mates: `name`, `ring`, `photo`, `tagline` (`""` if none), `links` (best link first), `glow: null`. Ring placement: same ring as what the user names; otherwise ask. Done when `python3 -m json.tool data/people.json` passes.
4. **Check** locally: `python3 -m http.server 5183`, open http://localhost:5183, find the new item, click opens the right link.
5. **Back up** `data/`: `~/coding/claude/claude-backup/sync.sh`, then commit and push there (`backup: orbit <what>`).
6. **Deploy**: `./build.sh && npx wrangler deploy`. Done when `curl -s <live-url>/data/people.json` shows the change.

`data/` is git-ignored and stays out of this repo: its git copy is the backup repo, so a data-only change has no Orbit commit.
