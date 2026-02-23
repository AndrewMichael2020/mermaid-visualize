import { Registry, Counter, Histogram, collectDefaultMetrics } from "prom-client";

// Singleton registry — reused across hot-reloads in dev via global
const globalForMetrics = global as typeof global & { _promRegistry?: Registry };

let registry: Registry;

if (!globalForMetrics._promRegistry) {
  registry = new Registry();
  collectDefaultMetrics({ register: registry });

  globalForMetrics._promRegistry = registry;
} else {
  registry = globalForMetrics._promRegistry;
}

export { registry };

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests handled",
  labelNames: ["method", "route", "status"],
  registers: [registry],
});

export const userActionsTotal = new Counter({
  name: "user_actions_total",
  help: "Total user action events",
  labelNames: ["action"],
  registers: [registry],
});

export const renderDurationSeconds = new Histogram({
  name: "render_duration_seconds",
  help: "Diagram render duration in seconds",
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [registry],
});
