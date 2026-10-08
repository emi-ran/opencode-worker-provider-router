import { test } from "node:test";
import assert from "node:assert/strict";
import plugin from "../index.js";

async function fixture() {
  let hook;
  const sessions = {
    local: { model: { providerID: "9router-local", id: "parent" } },
    remote: { model: { providerID: "9router", id: "parent" } },
    other: { model: { providerID: "openai", id: "parent" } },
    child: { parentID: "local", agent: "worker-fast", model: { providerID: "9router", id: "cx/sol", variant: "high" } },
  };
  const models = ["9router", "9router-local"].map((providerID) => ({
    providerID, id: "cx/sol", variants: [{ id: "medium-fast" }, { id: "high" }],
  }));
  await plugin.setup({
    tool: { hook: async (name, callback) => { assert.equal(name, "execute.before"); hook = callback; } },
    session: { get: async ({ sessionID }) => structuredClone(sessions[sessionID]) },
    agent: { get: async () => ({ model: { providerID: "9router", id: "cx/sol", variant: "medium-fast" } }) },
    model: { list: async () => models },
  });
  const event = (sessionID, input = {}) => ({ tool: "subagent", sessionID, input: { agent: "worker-fast", background: true, ...input } });
  return { hook, event, models };
}

test("local and remote calls remain session-scoped and preserve variant/input", async () => {
  const { hook, event } = await fixture();
  const local = event("local"), remote = event("remote");
  await Promise.all([hook(local), hook(remote)]);
  assert.equal(local.input.model, "9router-local/cx/sol#medium-fast");
  assert.equal(remote.input.model, "9router/cx/sol#medium-fast");
  assert.equal(local.input.background, true);
});
test("explicit models, unrelated providers/agents/tools are untouched", async () => {
  const { hook, event } = await fixture();
  for (const value of [event("local", { model: "openai/custom#low" }), event("other"), event("local", { agent: "explore" }), { ...event("local"), tool: "read" }]) {
    const original = structuredClone(value);
    await hook(value);
    assert.deepEqual(value, original);
  }
});
test("continuations follow parent provider and retain child variant", async () => {
  const { hook, event } = await fixture();
  const value = event("local", { sessionID: "child" });
  await hook(value);
  assert.equal(value.input.model, "9router-local/cx/sol#high");
});
test("missing models or variants fail instead of silently using remote", async () => {
  const { hook, event, models } = await fixture();
  models[1].variants = [];
  await assert.rejects(hook(event("local")), /routing target unavailable/);
  models.pop();
  await assert.rejects(hook(event("local")), /routing target unavailable/);
});
