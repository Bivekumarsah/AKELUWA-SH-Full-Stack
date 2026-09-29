const workerRuntimeStub = "data:text/javascript,export const tracing=undefined";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    return { shortCircuit: true, url: workerRuntimeStub };
  }
  return nextResolve(specifier, context);
}
