# 05: Make the browser opener say when it cannot open a browser

Status: ready-for-agent

**What to build:** `src/service/browser.ts` cannot report failure and kills its own
process instead. Verified at HEAD, not inferred: spawning a nonexistent command with no
`error` listener throws `ENOENT` as an unhandled event and exits 1, so
`openInDefaultBrowser`'s `try/catch` cannot return `false` for a missing opener — the
throw happens on the event loop, after the function has returned.

- [ ] Attach an `error` listener so a missing `open` / `xdg-open` is a returned failure
      rather than a process exit.
- [ ] Make the four call sites use the result. Today `src/mcp/service.ts:173,201,224,252`
      all call `openInDefaultBrowser(reviewUrl)` and discard the boolean, so even a
      correct failure return would be silent.
- [ ] When the browser cannot be opened here, the tool result must say so in words the
      agent can repeat: the review URL is the capability, the auto-open is a convenience.
      A human on a remote box with a port-forward must still get a usable result.
- [ ] Cover it with a test that drives a missing opener and asserts the returned result
      rather than the spawn, since the spawn path cannot be observed safely in-process.

**Why it matters:** this is the defect behind the settled "local-only is stated *and*
detected, not enforced" decision. Installation is becoming the human's own act with no
setup command to warn them, so the product's only remaining chance to say "I am running
where you are not looking" is this result.
