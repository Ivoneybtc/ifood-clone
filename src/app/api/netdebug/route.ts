import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  // Try IPv4 DNS via Google DNS
  const hosts = [
    "db.tfnjkhbkcxyksfdmhixr.supabase.co",
    "aws-0-sa-east-1.pooler.supabase.com",
  ];

  for (const host of hosts) {
    try {
      const resp = await fetch(
        `https://dns.google/resolve?name=${host}&type=A`,
      );
      const data = (await resp.json()) as Record<string, unknown>;
      const answers = data.Answer as Array<Record<string, string>> | undefined;
      results[`v4_${host}`] = answers?.map((a) => a.data) || [];
    } catch {
      errors.push(`v4_fail_${host}`);
    }
  }

  // Try fetching with explicit IPv4
  for (const target of [
    {
      host: "db.tfnjkhbkcxyksfdmhixr.supabase.co",
      port: 5432,
      label: "direct",
    },
    {
      host: "aws-0-sa-east-1.pooler.supabase.com",
      port: 6543,
      label: "pooler",
    },
  ]) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);

      const conn = await fetch(`http://${target.host}:${target.port}`, {
        signal: controller.signal,
        method: "HEAD",
        headers: { Host: target.host },
      });
      clearTimeout(id);
      results[`http_${target.label}`] = `reachable (${conn.status})`;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown error";
      results[`http_${target.label}`] = `error: ${msg}`;
    }

    // Also try HTTPS fetch to see if it's a port issue
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);

      const conn = await fetch(`https://${target.host}:${target.port}`, {
        signal: controller.signal,
        method: "HEAD",
      });
      clearTimeout(id);
      results[`https_${target.label}`] = `reachable (${conn.status})`;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown error";
      results[`https_${target.label}`] = `error: ${msg}`;
    }
  }

  if (errors.length) results.errors = errors;

  // Also check if there's a Vercel Postgres integration that might interfere
  results.vercelPostgresUrl = process.env.POSTGRES_URL
    ? "POSTGRES_URL is set (might override DATABASE_URL)"
    : "POSTGRES_URL not set (good)";

  return NextResponse.json(results);
}
