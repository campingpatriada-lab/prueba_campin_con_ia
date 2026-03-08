import { tursoClient } from "@/lib/turso-db"

export async function GET() {
  try {
    const result = await tursoClient.execute({
      sql: "SELECT estado FROM licencia LIMIT 1",
      args: [],
    })

    const estado = result.rows[0]?.estado === "true"
    return new Response(estado ? "true" : "false", {
      headers: { "Content-Type": "text/plain" },
    })
  } catch {
    return new Response("false", {
      headers: { "Content-Type": "text/plain" },
    })
  }
}
