import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Browser auth client (same origin as the app). */
export const authClient = createAuthClient({ plugins: [magicLinkClient()] });
