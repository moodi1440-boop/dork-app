import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-actor";

export async function GET() {
  return NextResponse.json(await getCurrentAdmin());
}
