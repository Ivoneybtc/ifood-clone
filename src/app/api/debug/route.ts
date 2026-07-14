import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export async function GET() {
  const results: Record<string, unknown> = {};

  results.envVars = {
    DATABASE_URL: (process.env.DATABASE_URL || "").replace(
      /postgresql:\/\/[^:]+:[^@]+@/,
      "postgresql://user:***@",
    ),
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  };

  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    results.dbConnection = "connected";

    const tables = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    results.tables = tables;

    await prisma.$disconnect();
  } catch (error) {
    results.dbConnection = "failed";
    results.dbError = error instanceof Error ? error.message : String(error);
    results.dbErrorCode =
      error instanceof Error
        ? (error as unknown as Record<string, unknown>).code
        : undefined;
  }

  return NextResponse.json(results);
}
