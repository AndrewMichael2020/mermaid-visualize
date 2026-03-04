import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {openAI} from '@genkit-ai/compat-oai/openai';
import {enableGoogleCloudTelemetry} from '@genkit-ai/google-cloud';

enableGoogleCloudTelemetry({
  // Disable fs auto-instrumentation — Next.js reads several manifest files
  // that may not exist and handles the ENOENT internally. Without this,
  // every such read shows up as an ERROR span in Cloud Run telemetry.
  autoInstrumentationConfig: {
    '@opentelemetry/instrumentation-fs': { enabled: false },
  },
});

export const ai = genkit({
  plugins: [
    googleAI(),
    openAI(),
  ],
});
