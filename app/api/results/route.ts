import { readResults } from "@/lib/server/services";
export const dynamic = "force-dynamic";
export async function GET() {
    const results = await readResults();
    return Response.json(results, { status: results.mode === "unavailable" ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
