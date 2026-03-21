import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@scaffold-social/database/client";
import * as schema from "@scaffold-social/database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-utils";
import crypto from "crypto";

const verifySchema = z.object({
  code: z.string().length(6).regex(/^\d+$/),
});

function verifyTOTP(secret: string, code: string): boolean {
  const time = Math.floor(Date.now() / 30000);
  
  for (let i = -1; i <= 1; i++) {
    const counter = time + i;
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));
    
    const hmac = crypto.createHmac("sha1", base32Decode(secret));
    hmac.update(counterBuffer);
    const digest = hmac.digest();
    
    const offset = digest[digest.length - 1]! & 0x0f;
    const binary =
      ((digest[offset]! & 0x7f) << 24) |
      ((digest[offset + 1]! & 0xff) << 16) |
      ((digest[offset + 2]! & 0xff) << 8) |
      (digest[offset + 3]! & 0xff);
    
    const otp = (binary % 1000000).toString().padStart(6, "0");
    
    if (otp === code) {
      return true;
    }
  }
  
  return false;
}

function base32Decode(encoded: string): Buffer {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  
  for (const char of encoded.toUpperCase()) {
    const val = base32chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  
  return Buffer.from(bytes);
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid code format" },
        { status: 400 }
      );
    }

    const { code } = parsed.data;

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.user.id),
      columns: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA not set up. Please start setup first." },
        { status: 400 }
      );
    }

    if (!verifyTOTP(user.twoFactorSecret, code)) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    await db
      .update(schema.users)
      .set({ twoFactorEnabled: true })
      .where(eq(schema.users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
