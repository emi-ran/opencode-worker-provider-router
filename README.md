# OpenCode Worker Provider Router

A small, dependency-free **OpenCode V2** server plugin. Workers keep their own model and reasoning variant, but use the provider selected in their parent session.

| Parent session provider | Worker provider |
| --- | --- |
| `9router-local` | `9router-local` |
| `9router` | `9router` |
| Any other provider | Unchanged |

For example, `worker-fast` configured as `9router/cx/gpt-6.1-sol#medium-fast` uses `9router-local/cx/gpt-6.1-sol#medium-fast` when called from a local session.

## Install

Requires OpenCode V2 with `ctx.tool.hook("execute.before")` (API inspected against **2.0.22**).

```sh
opencode plugin add github:emi-ran/opencode-worker-provider-router#v0.1.0
```

Both providers must already be configured with matching worker models and variants. The plugin does **not** create providers, start a local server, copy credentials, or change agent defaults.

## Behavior

- Applies only to the built-in `subagent` tool and agents named `worker`, `worker-mini`, `worker-mid`, `worker-combo`, and `worker-fast`.
- Reads the parent session on each call; concurrent local and remote sessions do not share routing state.
- Preserves explicit non-empty `model` arguments, including their provider and variant.
- For continued child sessions, preserves their current model/variant when the agent is unchanged, while following the current parent provider.
- Validates target availability and variant support. Missing targets stop the call rather than silently falling back to another provider.
- Leaves permissions, prompts, background settings, and unrelated agents/providers unchanged.
- Does not intercept direct API session creation or slash commands that bypass the `subagent` tool. Routing those paths is outside this release's scope.

This plugin runs before execution; it does not launch workers itself or authorize delegation. Existing OpenCode permissions still apply.

## Develop

```sh
npm test
```

Tests use Node's built-in test runner and mocked OpenCode contexts; they make no model requests. A loaded-plugin check alone does not establish end-to-end model routing. Live model calls can incur provider charges.

## Remove

```sh
opencode plugin remove github:emi-ran/opencode-worker-provider-router#v0.1.0
```

## License

MIT.
