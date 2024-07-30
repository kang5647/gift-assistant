import { assistantId } from "@/app/assistant-config";
import { openai } from "@/app/openai";

export const runtime = "nodejs";

// Send a new message to a thread
export async function POST(request: Request, { params: { threadId } }: { params: { threadId: string } }) {
  const { content } = await request.json();

  if (!assistantId) {
    return new Response("Assistant ID is not configured.", { status: 400 });
  }

  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: content,
  });

  const stream = openai.beta.threads.runs.stream(threadId, {
    assistant_id: assistantId!,
  });

  return new Response(stream.toReadableStream());
}
