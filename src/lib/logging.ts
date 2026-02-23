export const logUserActivity = async (
  userId: string | undefined,
  action: string,
  details?: any
) => {
  const uid = userId ?? "anonymous";

  // Write structured log to Cloud Datastore via server-side API route.
  // Metrics (prom-client) are incremented server-side in /api/log only.
  try {
    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid, action, details: details ?? null }),
    });
  } catch (err) {
    console.error("[logUserActivity] Failed to post log:", err);
  }
};

