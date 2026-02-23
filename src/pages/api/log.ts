import type { NextApiRequest, NextApiResponse } from "next";
import { Datastore } from "@google-cloud/datastore";
import { userActionsTotal } from "@/lib/metrics";

let datastore: Datastore | null = null;

function getDatastore(): Datastore {
  if (!datastore) {
    datastore = new Datastore({ projectId: process.env.GCP_PROJECT });
  }
  return datastore;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const { userId, action, details } = req.body ?? {};

  try {
    const ds = getDatastore();
    const key = ds.key("user_logs");
    await ds.save({
      key,
      data: {
        userId: userId ?? "anonymous",
        action: action ?? "unknown",
        details: details ?? null,
        timestamp: new Date().toISOString(),
        userAgent: req.headers["user-agent"] ?? "unknown",
      },
    });
    userActionsTotal.inc({ action: action ?? "unknown" });
    res.status(200).json({ ok: true });
  } catch (err) {
    // Log failure is non-fatal — don't break the caller
    console.error("[log] Datastore write failed:", err);
    res.status(200).json({ ok: false });
  }
}
