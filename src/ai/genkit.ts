import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {openAI} from '@genkit-ai/compat-oai/openai';
import {enableGoogleCloudTelemetry} from '@genkit-ai/google-cloud';

enableGoogleCloudTelemetry();

export const ai = genkit({
  plugins: [
    googleAI(),
    openAI(),
  ],
});
