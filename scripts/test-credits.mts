// Credit-system checks against a running `next dev` (npm run test:credits).
//
// Creates two fresh anonymous users (6 credits each), so it uses 2 anonymous sign-ins
// and makes 3 real fal calls (~$0.018). Every HTTP request carries a random
// x-forwarded-for from 198.18.0.0/15, so your own IP's daily bucket isn't touched.
// Budget deltas assume nobody else is generating against this project mid-run.

import { createHmac, randomInt, randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const COST = 2; // mirrors MODELS["flux-schnell"] in src/lib/credits.ts
const EST_USD = 0.006;
const SIGNUP_CREDITS = 6;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name} (run with --env-file=.env.local)`);
  return value;
}

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const PUBLISHABLE_KEY = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const IP_HASH_SALT = env("IP_HASH_SALT");
const IP_DAILY_LIMIT = Number(process.env.IP_DAILY_LIMIT ?? 30);

const admin = createClient(SUPABASE_URL, env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let failures = 0;

function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  const suffix = detail === undefined ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${suffix}`);
}

function section(title: string) {
  console.log(`\n${title}`);
}

type TestUser = { id: string; token: string; client: SupabaseClient };

async function newUser(): Promise<TestUser> {
  const client = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.session || !data.user) throw new Error(`signInAnonymously: ${error?.message}`);
  return { id: data.user.id, token: data.session.access_token, client };
}

function randomTestIp(): string {
  return `198.${randomInt(18, 20)}.${randomInt(0, 256)}.${randomInt(1, 255)}`;
}

function hashIp(bucket: string): string {
  return createHmac("sha256", IP_HASH_SALT).update(bucket).digest("hex");
}

type ApiResult = { status: number; body: { code?: string; credits?: number; generationId?: string } };

async function generate(
  opts: { token?: string; ip: string; failFal?: boolean; prompt?: string },
): Promise<ApiResult> {
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": opts.ip };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.failFal) headers["x-test-fail-fal"] = "1";
  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt: opts.prompt ?? "a lime green paper crane on a black desk, studio light" }),
  });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as ApiResult["body"] };
}

async function balance(userId: string): Promise<number> {
  const { data, error } = await admin.from("profiles").select("credits").eq("id", userId).single();
  if (error) throw error;
  return (data as { credits: number }).credits;
}

type LedgerRow = { delta: number; reason: string; generation_id: string | null };

async function ledger(userId: string): Promise<LedgerRow[]> {
  const { data, error } = await admin
    .from("credit_ledger")
    .select("delta, reason, generation_id")
    .eq("user_id", userId)
    .order("id");
  if (error) throw error;
  return data as LedgerRow[];
}

type GenerationRow = { id: string; status: string; ip_hash: string | null; created_at: string };

async function generations(userId: string): Promise<GenerationRow[]> {
  const { data, error } = await admin
    .from("generations")
    .select("id, status, ip_hash, created_at")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return data as GenerationRow[];
}

async function totalSpentUsd(): Promise<number> {
  const { data, error } = await admin.from("app_budget").select("total_spent_usd").single();
  if (error) throw error;
  return Number((data as { total_spent_usd: string | number }).total_spent_usd);
}

async function checkLedgerMatchesBalance(user: TestUser) {
  const rows = await ledger(user.id);
  const sum = rows.reduce((acc, r) => acc + r.delta, 0);
  const credits = await balance(user.id);
  check("ledger sum equals balance", sum === credits, { ledgerSum: sum, balance: credits });
}

type RpcResult = { ok: boolean; code?: string; generation_id?: string; refunded?: boolean };

function startArgs(userId: string, ipHash: string, ipDailyLimit: number) {
  return {
    p_user_id: userId,
    p_prompt: "credit test (direct rpc)",
    p_model: "flux-schnell",
    p_aspect: "1:1",
    p_batch: 1,
    p_cost_credits: COST,
    p_est_usd: EST_USD,
    p_ip_hash: ipHash,
    p_ip_daily_limit: ipDailyLimit,
  };
}

async function startDirect(userId: string, ipHash: string, ipDailyLimit: number): Promise<RpcResult> {
  const { data, error } = await admin.rpc("start_generation", startArgs(userId, ipHash, ipDailyLimit));
  if (error) throw error;
  return data as RpcResult;
}

async function failDirect(generationId: string): Promise<RpcResult> {
  const { data, error } = await admin.rpc("fail_generation", {
    p_generation_id: generationId,
    p_error: "credit test",
  });
  if (error) throw error;
  return data as RpcResult;
}

function tally(results: ApiResult[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of results) {
    const key = `${r.status} ${r.body.code ?? "OK"}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function parallelSpend() {
  section("1. 10 parallel requests with 2 credits left");
  const user = await newUser();
  const ip = randomTestIp();
  console.log(`  user ${user.id}, ip ${ip}`);

  for (const expected of [SIGNUP_CREDITS - COST, SIGNUP_CREDITS - 2 * COST]) {
    const r = await generate({ token: user.token, ip });
    check(`setup generation -> 200, ${expected} credits left`, r.status === 200 && r.body.credits === expected, {
      status: r.status,
      body: r.body,
    });
  }
  check("balance before burst is 2", (await balance(user.id)) === 2);

  const spentBefore = await totalSpentUsd();
  const results = await Promise.all(Array.from({ length: 10 }, () => generate({ token: user.token, ip })));
  const counts = tally(results);
  console.log(`  responses: ${JSON.stringify(counts)}`);

  check("exactly 1 succeeded", results.filter((r) => r.status === 200).length === 1);
  check(
    "exactly 9 refused with 402 INSUFFICIENT_CREDITS",
    results.filter((r) => r.status === 402 && r.body.code === "INSUFFICIENT_CREDITS").length === 9,
  );
  check("final balance is 0", (await balance(user.id)) === 0);

  const rows = await ledger(user.id);
  const reasons = rows.map((r) => `${r.reason}${r.delta > 0 ? "+" : ""}${r.delta}`);
  check(
    "ledger is grant+6, 3x spend-2, no refunds",
    JSON.stringify(reasons) === JSON.stringify(["grant+6", "spend-2", "spend-2", "spend-2"]),
    reasons.join(", "),
  );
  await checkLedgerMatchesBalance(user);

  const gens = await generations(user.id);
  check(
    "3 generations, all succeeded (refused requests left no rows)",
    gens.length === 3 && gens.every((g) => g.status === "succeeded"),
    gens.map((g) => g.status),
  );
  check(
    "generations.ip_hash is HMAC(salt, ip), not the raw IP",
    gens.every((g) => g.ip_hash === hashIp(ip)),
  );

  const delta = (await totalSpentUsd()) - spentBefore;
  check(`app_budget grew by exactly one image ($${EST_USD})`, Math.abs(delta - EST_USD) < 1e-9, {
    delta: delta.toFixed(4),
  });
  return user;
}

async function forcedFailure(): Promise<{ user: TestUser; generationId: string }> {
  section("2. Forced fal failure refunds the credits");
  const user = await newUser();
  console.log(`  user ${user.id}`);
  const spentBefore = await totalSpentUsd();

  const r = await generate({ token: user.token, ip: randomTestIp(), failFal: true });
  check("responds 502 PROVIDER_ERROR", r.status === 502 && r.body.code === "PROVIDER_ERROR", {
    status: r.status,
    body: r.body,
  });
  check("balance is back to 6", (await balance(user.id)) === SIGNUP_CREDITS);

  const gens = await generations(user.id);
  check("one generation, status failed", gens.length === 1 && gens[0].status === "failed", gens.map((g) => g.status));
  const generationId = gens[0].id;

  const rows = (await ledger(user.id)).filter((row) => row.generation_id === generationId);
  const refunds = rows.filter((row) => row.reason === "refund");
  check("ledger for that generation: one spend -2, exactly one refund +2", rows.length === 2 &&
    rows.some((row) => row.reason === "spend" && row.delta === -COST) &&
    refunds.length === 1 && refunds[0].delta === COST, rows);
  await checkLedgerMatchesBalance(user);

  const delta = (await totalSpentUsd()) - spentBefore;
  check("app_budget unchanged after refund", Math.abs(delta) < 1e-9, { delta: delta.toFixed(4) });
  return { user, generationId };
}

async function doubleFail(user: TestUser, failedGenerationId: string) {
  section("3. fail_generation twice does not double-refund");

  const again = await failDirect(failedGenerationId);
  check("fail_generation on the already-failed generation -> NOT_PENDING", again.ok === false && again.code === "NOT_PENDING", again);
  check("balance still 6", (await balance(user.id)) === SIGNUP_CREDITS);

  const started = await startDirect(user.id, hashIp(randomTestIp()), 1000);
  check("start_generation (service role) -> pending, balance 4", started.ok && (await balance(user.id)) === 4, started);
  const generationId = started.generation_id!;

  const concurrent = await Promise.all([failDirect(generationId), failDirect(generationId)]);
  const third = await failDirect(generationId);
  check(
    "two concurrent calls: exactly one refunded",
    concurrent.filter((c) => c.ok && c.refunded).length === 1 &&
      concurrent.filter((c) => !c.ok && c.code === "NOT_PENDING").length === 1,
    concurrent,
  );
  check("third call -> NOT_PENDING", third.ok === false && third.code === "NOT_PENDING", third);

  const refunds = (await ledger(user.id)).filter((r) => r.generation_id === generationId && r.reason === "refund");
  check("exactly one refund row for the generation", refunds.length === 1, refunds);
  check("balance is 6 again", (await balance(user.id)) === SIGNUP_CREDITS);
  await checkLedgerMatchesBalance(user);
}

async function ipCap(user: TestUser) {
  section("4a. Per-IP cap in start_generation, under concurrency (limit 2, 3 parallel, credits for 3)");
  const ipHash = hashIp(randomTestIp());
  const results = await Promise.all([1, 2, 3].map(() => startDirect(user.id, ipHash, 2)));
  check(
    "exactly 2 started, 1 IP_LIMIT",
    results.filter((r) => r.ok).length === 2 && results.filter((r) => r.code === "IP_LIMIT").length === 1,
    results.map((r) => (r.ok ? "ok" : r.code)),
  );
  for (const r of results.filter((x) => x.ok)) await failDirect(r.generation_id!);
  check("cleanup refunded both, balance 6", (await balance(user.id)) === SIGNUP_CREDITS);

  section(`4b. Per-IP cap over HTTP at IP_DAILY_LIMIT=${IP_DAILY_LIMIT} (forced failures still count)`);
  if (IP_DAILY_LIMIT > 100) {
    check(`skipped: IP_DAILY_LIMIT=${IP_DAILY_LIMIT} is too high to fill with requests; set <= 100`, false);
  } else {
    const ip = randomTestIp();
    const statuses: number[] = [];
    for (let i = 0; i < IP_DAILY_LIMIT; i++) {
      statuses.push((await generate({ token: user.token, ip, failFal: true })).status);
    }
    check(`first ${IP_DAILY_LIMIT} requests reach fal (502, refunded)`, statuses.every((s) => s === 502), {
      statuses: [...new Set(statuses)],
    });
    const over = await generate({ token: user.token, ip, failFal: true });
    check(`request ${IP_DAILY_LIMIT + 1} -> 429 IP_LIMIT`, over.status === 429 && over.body.code === "IP_LIMIT", {
      status: over.status,
      body: over.body,
    });
    const other = await generate({ token: user.token, ip: randomTestIp(), failFal: true });
    check("same user from another IP is not blocked (502, not 429)", other.status === 502, { status: other.status });
    check("balance still 6 (refused request spent nothing)", (await balance(user.id)) === SIGNUP_CREDITS);
    await checkLedgerMatchesBalance(user);
  }

  section("4c. IPv6 addresses are bucketed by /64");
  const a = randomInt(1, 0xffff).toString(16);
  const b = randomInt(1, 0xffff).toString(16);
  const c = randomInt(1, 0xffff).toString(16);
  const ips = [`2001:db8:${a}:${b}::1`, `2001:DB8:${a}:${b}:ffff:ffff:ffff:fffe`, `2001:db8:${a}:${c}::1`];
  for (const ip of ips) await generate({ token: user.token, ip, failFal: true });
  const hashes = (await generations(user.id)).slice(-3).map((g) => g.ip_hash);
  check(`${ips[0]} and ${ips[1]} share a bucket`, hashes[0] === hashes[1]);
  check(`${ips[2]} (different /64) does not`, hashes[2] !== hashes[0]);
  check("bucket hash is HMAC(salt, \"<first 4 groups>::/64\")", hashes[0] === hashIp(`2001:db8:${a}:${b}::/64`));
}

async function noAuth() {
  section("5. Unauthenticated requests are rejected");
  const ip = randomTestIp();
  const none = await generate({ ip });
  check("no Authorization header, no cookie -> 401 UNAUTHENTICATED", none.status === 401 && none.body.code === "UNAUTHENTICATED", {
    status: none.status,
    body: none.body,
  });
  const garbage = await generate({ ip, token: "not-a-jwt" });
  check("garbage bearer -> 401", garbage.status === 401, { status: garbage.status });
  const publishable = await generate({ ip, token: PUBLISHABLE_KEY });
  check("publishable key as bearer -> 401", publishable.status === 401, { status: publishable.status });
}

async function browserCannotCallCreditFunctions(user: TestUser) {
  section("6. The browser (publishable key) cannot touch credits directly");
  const anonymous = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const args = startArgs(user.id, hashIp(randomTestIp()), 1000);
  const before = await balance(user.id);

  // 42501 = insufficient_privilege. Anything else (e.g. PGRST202 "function not found")
  // would mean the call was malformed, not refused, so it doesn't count as a pass.
  const cases: [string, PromiseLike<{ error: { code: string; message: string } | null }>][] = [
    ["start_generation, no session (anon role)", anonymous.rpc("start_generation", args)],
    ["start_generation, signed-in visitor (authenticated role)", user.client.rpc("start_generation", args)],
    ["fail_generation, signed-in visitor", user.client.rpc("fail_generation", { p_generation_id: randomUUID(), p_error: "x" })],
    ["complete_generation, signed-in visitor", user.client.rpc("complete_generation", { p_generation_id: randomUUID(), p_assets: [] })],
    ["UPDATE profiles.credits, signed-in visitor", user.client.from("profiles").update({ credits: 999 }).eq("id", user.id)],
    ["INSERT credit_ledger, signed-in visitor", user.client.from("credit_ledger").insert({ user_id: user.id, delta: 100, reason: "grant" })],
  ];
  for (const [name, call] of cases) {
    const { error } = await call;
    check(`${name} -> permission denied (42501)`, error?.code === "42501", error ? `${error.code}: ${error.message}` : "no error");
  }
  check("balance unchanged", (await balance(user.id)) === before);
}

async function noProfile() {
  section("7. NO_PROFILE for a user id without a profiles row");
  const r = await startDirect(randomUUID(), hashIp(randomTestIp()), 1000);
  check("start_generation -> NO_PROFILE (was INSUFFICIENT_CREDITS)", r.ok === false && r.code === "NO_PROFILE", r);
}

// ---------------------------------------------------------------------------

const health = await fetch(BASE_URL).catch(() => null);
if (!health) {
  console.error(`No server at ${BASE_URL}. Start it with npm run dev.`);
  process.exit(1);
}

console.log(`Credit tests against ${BASE_URL} (IP_DAILY_LIMIT=${IP_DAILY_LIMIT})`);
await parallelSpend();
const { user, generationId } = await forcedFailure();
await doubleFail(user, generationId);
await ipCap(user);
await noAuth();
await browserCannotCallCreditFunctions(user);
await noProfile();

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
