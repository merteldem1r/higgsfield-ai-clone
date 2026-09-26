import "server-only";

import { createHmac } from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";

const DEFAULT_IP_DAILY_LIMIT = 30;

// The wand and /prompter both count against start_prompt_improvement, so they share this per-network allowance.
// Free, so the only brake is per network. An LLM call is ~$0.00003, so this caps abuse, not spend.
export const PROMPT_HELP_DAILY_LIMIT = 20;

// Vercel overwrites both headers at its edge, so a client can't spoof them in
// production. `next dev` keeps whatever the client sent, which the test script uses.
function clientIp(request: Request): string | null {
  const ip =
    request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim() || null;
}

// One IPv6 host usually owns a whole /64, so counting full addresses would let it
// rotate through unlimited buckets. IPv4-mapped addresses count as their IPv4.
function ipBucket(ip: string | null): string {
  if (!ip) return "unknown";
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  if (isIPv4(ip)) return ip;

  const address = ip.split("%")[0].toLowerCase();
  if (!isIPv6(address)) return "unknown";

  const [head, tail] = address.split("::");
  const headGroups = head ? head.split(":") : [];
  // A trailing dotted quad takes two groups; its value never reaches the first four.
  const tailGroups = tail ? tail.split(":").flatMap((g) => (g.includes(".") ? ["0", "0"] : [g])) : [];
  const groups =
    tail === undefined
      ? headGroups
      : [...headGroups, ...Array<string>(8 - headGroups.length - tailGroups.length).fill("0"), ...tailGroups];

  return `${groups
    .slice(0, 4)
    .map((g) => parseInt(g, 16).toString(16))
    .join(":")}::/64`;
}

// Requests without an IP share one "unknown" bucket, so a missing header can't lift the cap.
export function hashClientIp(request: Request): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) throw new Error("Missing env var IP_HASH_SALT");
  return createHmac("sha256", salt).update(ipBucket(clientIp(request))).digest("hex");
}

export function ipDailyLimit(): number {
  const raw = process.env.IP_DAILY_LIMIT;
  if (!raw) return DEFAULT_IP_DAILY_LIMIT;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 0) throw new Error("IP_DAILY_LIMIT must be a non-negative integer");
  return limit;
}
