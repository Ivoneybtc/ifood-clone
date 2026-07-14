import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
  try {
    const tables = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    );
    return NextResponse.json({ success: true, tables });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : "Unknown",
        stack:
          error instanceof Error ? error.stack?.split("\n").slice(0, 5) : [],
      },
      { status: 500 },
    );
  }
}
