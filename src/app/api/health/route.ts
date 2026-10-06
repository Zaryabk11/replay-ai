export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", time: new Date().toISOString() });
}
