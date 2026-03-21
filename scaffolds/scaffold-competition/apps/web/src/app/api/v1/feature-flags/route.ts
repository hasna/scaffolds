import { NextResponse } from "next/server";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";

export async function GET() {
  try {
    const flags = await db.query.featureFlags.findMany();

    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      result[flag.key] = flag.defaultEnabled;
    }

    return NextResponse.json({ flags: result });
  } catch (error) {
    console.error("Feature flags error:", error);
    return NextResponse.json({ flags: {} });
  }
}
