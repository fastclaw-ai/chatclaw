import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getDb, schema } from "@/lib/drizzle";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const db = getDb();

  const existing = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .all();
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  const passwordHash = await hash(password, 12);
  const now = Date.now();

  db.insert(schema.users)
    .values({
      id: randomUUID(),
      email,
      name: name || email.split("@")[0],
      passwordHash,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return NextResponse.json({ ok: true });
}
