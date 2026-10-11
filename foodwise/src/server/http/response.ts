import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return json(
      { error: error.issues[0]?.message || "Check the submitted fields." },
      400,
    );
  if (error instanceof SyntaxError)
    return json({ error: "Invalid request body." }, 400);
  console.error(
    "Foodwise request failed",
    error instanceof Error ? error.message : "unknown",
  );
  return json({ error: "Something went wrong. Please try again." }, 500);
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const allowed = [new URL(req.url).host, req.headers.get("host")];
  if (!allowed.includes(new URL(origin).host))
    throw new HttpError(403, "This request origin is not allowed.");
}
export async function bodyJson(req: Request): Promise<unknown> {
  const body = await req.text();
  if (body.length > 32768)
    throw new HttpError(413, "This request is too large.");
  return JSON.parse(body);
}
