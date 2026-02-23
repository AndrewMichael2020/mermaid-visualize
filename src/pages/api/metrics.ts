import type { NextApiRequest, NextApiResponse } from "next";
import { registry } from "@/lib/metrics";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).end();
    return;
  }
  const metrics = await registry.metrics();
  res.setHeader("Content-Type", registry.contentType);
  res.status(200).send(metrics);
}
