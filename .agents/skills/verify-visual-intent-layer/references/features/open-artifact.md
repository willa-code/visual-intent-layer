# Open an Artifact and render it faithfully

A Builder-Reviewer opens a saved-HTML Artifact and gets a faithful rendering of it in the Review Surface, or opens a running local application and gets the same surface over the live app. Before driving, the agent can check that the instance is alive, is the run's own, reflects the working tree, and still authorises the session.

## Sub-features

- `open-html` opens a saved-HTML Artifact by filesystem path and mints its review URL.
- `open-app` opens a running local application by loopback URL.
- `open-identity` hands back the session identity, base URL and review URL as structured data.
- `open-isolation` puts each run on a disposable lifecycle data directory and an ephemeral port.
- `open-faithful` renders the artifact's text, styles, controls and assets.
- `open-health` read-only reports liveness, ownership, build freshness and capability authorisation.
- `open-cleanup` removes the instance and its data without consuming the evidence.

## How to get to it (user POV)

- Run `visual-intent open --html <path>` and open the printed review URL.
- Run `visual-intent open --app <localhost-url>` and open the printed review URL.
- Let an agent host call the `open_visual_review` MCP tool and open the printed review URL.

## Driving it with the Lever

Preconditions:

- The repository is at the working tree to verify; the Lever rebuilds it.
- `fixtures/gallery.html` exists.
- No run is currently holding the lifecycle data directory you are about to use.

- **Launch the saved-HTML Artifact.** Run `node .agents/skills/verify-visual-intent-layer/bin/lever.mjs launch --html fixtures/gallery.html --name open-artifact`. Exit code `0` and JSON naming `baseUrl`, `reviewUrl`, `sessionId`, `artifact.revision`, `productPid`, `hostPid` and `dataDir`. The review URL carries the capability only inside `?cap=`.
- **Health-check before driving.** Run `… lever.mjs health`. Exit code `0`, `alive`, `owned`, `capabilityAuthorised` and `buildFreshness` all true, `stale` false. The report is read-only: `… lever.mjs state` returns the same annotations before and after.
- **See the artifact render.** Run `… lever.mjs screenshot --name opened`. Exit code `0` and a PNG under the run's `evidence/`. The PNG shows the topbar, the artifact, and the heading `Summer gallery`.
- **Read the surface structure.** Run `… lever.mjs snapshot --name opened`. Exit code `0` and an ARIA snapshot file under `evidence/` naming the `Review` and `Verify` tabs and the selection tools.
- **Prove only one browser exists.** The launch suppresses the product's automatic browser; the only browser is the host's. `… lever.mjs health` reports the same product pid and the host endpoint while no extra browser window appears.
- **Check the artifact is faithful, not just present.** Run `… lever.mjs state` for the artifact identity, then `wait --target ".gallery figure" --frame artifact` and `snapshot --frame artifact`. The wait resolves and the snapshot names the three figures and `Place order`.
- **Clean up.** Run `… lever.mjs cleanup`. Exit code `0`, `evidenceIntact` true, the product and host pids gone, `dataDir` removed. The PNG and ARIA snapshot still exist under `evidence/`, and `run.json` reports `evidenceIntact: true`.
- **Unreachable path example.** Run `… lever.mjs select --tool element --target ".not-there"` on a live run. Exit code `4`; `run.json` records the command and the unmet precondition. It is not counted as covered.

## Gotchas

- `launch` rebuilds the product. On a cold checkout the first launch takes longer than later commands; do not mistake the build for a hang.
- The review URL contains the per-session capability. Treat it as a secret: never paste it into committed evidence. The Lever redacts it in the run record and health report.
- The host is headless by default. Pass `--headed` to launch when a human wants to watch or take over.
- `open-app` only accepts a loopback `http(s)` origin; a non-loopback or authenticated production origin is refused before any session is minted.
- A second `launch` against a lifecycle data directory a live run already owns is refused and names the owning process. Clean up that run first, or choose another `--data-dir`.
- Removing the lifecycle data directory by hand strands the lock. Use `cleanup`, which removes the lock too.
- Health reports `stale` when source is newer than `dist`, or when the revision moved since launch. A stale instance is refused by every drive command; relaunch instead of driving it.