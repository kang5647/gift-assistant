export let assistantId: string | undefined = ""; // set your assistant ID here

if (assistantId === "") {
  assistantId = process.env.NEXT_PUBLIC_OPENAI_ASSISTANT_ID;
}
