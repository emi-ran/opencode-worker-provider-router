const providers = new Set(["9router", "9router-local"]);
const workers = new Set(["worker", "worker-mini", "worker-mid", "worker-combo", "worker-fast"]);

export default {
  id: "opencode.worker-provider-router",
  async setup(ctx) {
    await ctx.tool.hook("execute.before", async (event) => {
      const input = event.input;
      if (event.tool !== "subagent" || !input || typeof input !== "object" ||
          !workers.has(input.agent) || (input.model !== undefined && input.model !== "")) return;

      const parent = await ctx.session.get({ sessionID: event.sessionID });
      const providerID = parent.model?.providerID;
      if (!providers.has(providerID)) return;

      const agent = await ctx.agent.get({ agentID: input.agent });
      // Continued sessions retain their model/variant unless the requested agent changes.
      const child = input.sessionID ? await ctx.session.get({ sessionID: input.sessionID }) : undefined;
      if (child && child.parentID !== event.sessionID) return;
      const model = child?.agent === input.agent ? child.model : agent.model;
      if (!model || !providers.has(model.providerID)) return;

      const available = await ctx.model.list();
      const target = available.find((item) => item.providerID === providerID && item.id === model.id);
      if (!target || target.enabled === false ||
          (model.variant && !target.variants.some((variant) => variant.id === model.variant))) {
        throw new Error(`Worker routing target unavailable: ${providerID}/${model.id}${model.variant ? `#${model.variant}` : ""}`);
      }
      event.input = {
        ...input,
        model: `${providerID}/${model.id}${model.variant ? `#${model.variant}` : ""}`,
      };
    });
  },
};
