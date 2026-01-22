import { NextResponse } from "next/server";

export function json(data: any, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function error(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}
