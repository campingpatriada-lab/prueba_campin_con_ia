export async function GET() {
  return new Response("hola desde v0 app camping", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  })
}
