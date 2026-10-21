import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDump } from "./debug.js";
import { createAskJev, PROVIDERS } from "./jev.js";
import { createEventLog } from "./events.js";

const config = loadConfig();

// createAskJev checks the key per call, so a missing one would only show up as failed questions: say so at boot.
if (config.routing && !config.jevApiKey) {
  console.log(`warning: JEV routing is on but ${PROVIDERS[config.jevProvider].keyEnv} is not set; questions to JEV will fail until it is.`);
}

const app = createApp({
  config,
  askJev: createAskJev(config),
  dump: createDump(config.debugDumpDir),
  events: createEventLog({ historyFile: config.logFile }),
  log: (entry) => console.log(JSON.stringify({ time: new Date().toISOString(), ...entry })),
});

serve({ fetch: app.fetch, hostname: config.host, port: config.port }, ({ port }) => {
  // Origin and path only: the upstream URL may carry userinfo or a token in its query.
  const upstream = new URL(config.upstreamBaseUrl);
  console.log(`master-jev-hook listening on http://localhost:${port} → ${upstream.origin}${upstream.pathname} (jev: ${config.jevModel} via ${config.jevProvider})`);
  console.log(`dashboard: http://localhost:${port}/dashboard`);
});
