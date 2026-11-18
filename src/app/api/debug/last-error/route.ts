import { NextResponse } from "next/server";
import { getCapturedErrors } from "@/instrumentation";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ errors: getCapturedErrors() });
}
