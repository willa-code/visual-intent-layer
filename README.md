# Visual Intent Layer

Point at what you see and say what should change. The agent changes exactly that,
and you verify by hand. It reviews a browser-rendered artifact — a saved HTML
document, or a web app running on this machine; a native window, a design file or
a PDF is outside it by decision rather than omission.

## Install

Requires Node 20+. No Rust toolchain, no hosted account.

The product is a standard local MCP server. You register it with your own agent's
MCP mechanism — there is no install command of ours to run, and nothing of yours
that we write.

| Harness     | What to run                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| Claude Code | `claude mcp add visual-intent-layer -- npx -y --package visual-intent-layer@latest visual-intent-mcp`      |
| Codex       | `codex mcp add visual-intent-layer -- npx -y --package visual-intent-layer@latest visual-intent-mcp`       |
| opencode    | `opencode mcp add visual-intent-layer`, then give it `npx` and the arguments above when it asks             |
| pi          | the entry below, with `pi-mcp-adapter` installed, or the adapter's `/mcp` panel                             |
| any other   | any host that can launch a local stdio server: command `npx`, arguments `-y --package visual-intent-layer@latest visual-intent-mcp` |

Registry-aware clients can also find the server as
`io.github.willa-code/visual-intent-layer` in the official MCP Registry, which lists
where to get it rather than hosting it.

**Install it on the machine where you look at the screen.** The Review Surface
launches a browser on the machine running the server and binds a loopback port
there. A server in a container, on a remote host, or inside a cloud agent has
nothing to show you.

Registering takes effect when your agent next starts, so restart it.

### The pi entry

pi itself ships no MCP; `pi-mcp-adapter` provides it. Add this to the project's
`.mcp.json` — merge it into `mcpServers` if the file already has one, rather than
replacing the file:

```json
{
  "mcpServers": {
    "visual-intent-layer": {
      "command": "npx",
      "args": ["-y", "--package", "visual-intent-layer@latest", "visual-intent-mcp"]
    }
  }
}
```

A project `.mcp.json` applies to that project only. `.pi/mcp.json` is the Pi-only
project override, and `~/.config/mcp/mcp.json` applies to every project. With the
package installed globally, the entry's `command` is `visual-intent` and its
`args` are `["mcp"]`.

### Update

`@latest` is resolved when npx fetches the package, so there is nothing to update
by hand — unless your Harness caches the resolved command and keeps serving it:
`pi-mcp-adapter` caches for 24 hours. Restart the agent, or clear that cache, to
force a fetch. `npm view visual-intent-layer version` says what is current.

To hold a version still, replace `@latest` with an exact version in the entry. A
global install updates with `npm install -g visual-intent-layer@latest`.

### Uninstall

Remove the entry you added, with the mechanism you added it: `codex mcp remove
visual-intent-layer` in Codex, `claude mcp remove visual-intent-layer` in Claude
Code, and by deleting the entry from your Harness's own MCP config everywhere
else. A global install comes out with `npm uninstall -g visual-intent-layer`.

Uninstalling deletes none of your reviews: Annotations, sessions and attachments
stay in `~/.visual-intent-layer/data` until you remove that directory.
`docs/guide.md` names the file each Harness keeps its entry in.

### If the tools do not appear

Run the entry's command by hand first. It separates Node and npm from the Harness:

```sh
npx -y --package visual-intent-layer@latest visual-intent-mcp
```

It prints `visual-intent review service on http://127.0.0.1:<port>` to stderr and
then holds the connection open for an agent; `Ctrl-C` ends it. If that works, your
agent's own MCP panel is where the reason is: it names the server and reports why
it failed to start. The product cannot tell you — it writes no configuration and
reads none.

The server runs without an agent too:

```sh
visual-intent open --html ./checkout.html     # opens the browser, prints the review URL
```

## Documentation

[`docs/guide.md`](docs/guide.md) is the product manual: the Review Surface, the
Annotation model, target resolution, Check-In, the four MCP tools, environment and
data, the envelope schema, develop and layout. `SECURITY.md` holds the threat
model, supported versions and the disclosure process. `docs/adr/` records why the
product behaves as it does, and `docs/pi-validation.md` is the live-pi checklist,
awaiting a human run.

## License

Apache-2.0. The complete local loop is permissively open.
