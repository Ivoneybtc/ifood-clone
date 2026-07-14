import { NextResponse } from "next/server";

export async function GET() {
  const results: Record<string, unknown> = {};
  const errors: string[] = [];
  const dbUrl = process.env.DATABASE_URL || "";

  results.dbUrlPrefix =
    dbUrl.split("://")[0] + "://user:***@" + dbUrl.split("@")[1] || "unknown";

  // Test DNS resolution and connectivity
  const hosts = [
    "db.tfnjkhbkcxyksfdmhixr.supabase.co",
    "aws-0-sa-east-1.pooler.supabase.com",
    "google.com",
  ];

  for (const host of hosts) {
    try {
      const url = `https://dns.google/resolve?name=${host}&type=AAAA`;
      const resp = await fetch(url);
      const data = await resp.json();
      const addresses =
        data.Answer?.map((a: Record<string, string>) => a.data) || [];
      results[`dns_${host}`] = addresses;
    } catch {
      errors.push(`dns_fail_${host}`);
    }
  }

  // Test direct TCP connectivity to Supabase
  for (const target of [
    { host: "db.tfnjkhbkcxyksfdmhixr.supabase.co", port: 5432 },
    { host: "aws-0-sa-east-1.pooler.supabase.com", port: 6543 },
  ]) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);

      const conn = await fetch(`https://${target.host}:${target.port}`, {
        signal: controller.signal,
        method: "HEAD",
      });
      results[`tcp_${target.host}:${target.port}`] =
        `reachable (${conn.status})`;
    } catch (e: unknown) {
      results[`tcp_${target.host}:${target.port}`] =
        e instanceof Error ? `error: ${e.message}` : "unknown error";
    }
  }

  if (errors.length) results.dnsErrors = errors;

  return NextResponse.json(results);
}
