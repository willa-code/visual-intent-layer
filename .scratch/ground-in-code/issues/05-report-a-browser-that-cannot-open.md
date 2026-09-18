# 05: Make the browser opener say when it cannot open a browser

Status: done

**What to build:** `src/service/browser.ts` cannot report failure and kills its own
process instead. Verified at HEAD, not inferred: spawning a nonexistent command with no
`error` listener throws `ENOENT` as an unhandled event and exits 1, so
`openInDefaultBrowser`'s `try/catch` cannot return `false` for a missing opener — the
throw happens on the event loop, after the function has returned.

- [x] Attach an `error` listener so a missing `open` / `xdg-open` is a returned failure
      rather than a process exit.
- [x] Make the four call sites use the result. Today `src/mcp/service.ts:173,201,224,252`
      all call `openInDefaultBrowser(reviewUrl)` and discard the boolean, so even a
      correct failure return would be silent.
- [x] When the browser cannot be opened here, the tool result must say so in words the
      agent can repeat: the review URL is the capability, the auto-open is a convenience.
      A human on a remote box with a port-forward must still get a usable result.
- [x] Cover it with a test that drives a missing opener and asserts the returned result
      rather than the spawn, since the spawn path cannot be observed safely in-process.

**Why it matters:** this is the defect behind the settled "local-only is stated *and*
detected, not enforced" decision. Installation is becoming the human's own act with no
setup command to warn them, so the product's only remaining chance to say "I am running
where you are not looking" is this result.

## Comments

Landed. `openInDefaultBrowser` is now async and resolves a boolean: it takes an
injectable `SpawnOpener` seam (defaulting to `spawn`), attaches `once('error')`
before anything else, and unrefs only after `once('spawn')`. A synchronous `spawn`
throw is caught. The platform opener moved into `openerSpec(url, platform)`, which is
what makes the three platform branches testable at all.

The four duplicated `if (openOptions.openBrowser) { openInDefaultBrowser(reviewUrl) }`
blocks became one `openBrowserIfAsked` helper, so `OpenedArtifact` gained
`browserOpened?: boolean` — `true` opened, `false` attempted and failed, `undefined`
never asked. `createReviewService` gained an `openUrl` option so a test can drive the
failure without a spawn.

The tool result carries the sentence the agent can repeat: "This machine could not
open a browser, so nothing was launched here; the review URL above is the way in."
The CLI prints its own line for the same case, and `README.md` and the feature map's
`open-artifact.md` both record the behaviour — the map gains `open-no-browser` and
says plainly in Gotchas that it has no live drive, because a Lever run suppresses the
automatic browser and always has a host.

Tests: `src/service/browser.test.ts` is new (5 cases: platform spec, missing opener,
synchronous throw, success plus unref, suppression parsing); `service.test.ts` gained
the three-state assertion; `protocol.test.ts` gained the end-to-end check that the
tool text contains the sentence. Full suite 423 passed, 31 files.
