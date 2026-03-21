import { NextResponse } from "next/server";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import crypto from "crypto";

function generateSecret(length: number = 20): string {
  const buffer = crypto.randomBytes(length);
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (const byte of buffer) {
    secret += base32chars[byte % 32];
  }
  return secret;
}

export async function POST() {
  try {
    const session = await requireAuth();

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.user.id),
      columns: { twoFactorEnabled: true, email: true },
    });

    if (user?.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
    }

    const secret = generateSecret();

    await db
      .update(schema.users)
      .set({ twoFactorSecret: secret })
      .where(eq(schema.users.id, session.user.id));

    const issuer = encodeURIComponent(process.env.NEXT_PUBLIC_APP_NAME || "SaaSScaffold");
    const account = encodeURIComponent(user?.email || session.user.email || "user");
    const otpauthUrl =
      "otpauth://totp/" +
      issuer +
      ":" +
      account +
      "?secret=" +
      secret +
      "&issuer=" +
      issuer +
      "&algorithm=SHA1&digits=6&period=30";

    return NextResponse.json({
      secret,
      otpauthUrl,
      qrCode:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
        encodeURIComponent(otpauthUrl),
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireAuth();

    await db
      .update(schema.users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
      })
      .where(eq(schema.users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
