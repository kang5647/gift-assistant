import { openai } from "@/app/openai";

export const runtime = "nodejs";

// Create a new assistant
export async function POST() {
  const assistant = await openai.beta.assistants.create({
    instructions: "You are a gift shopping assistant. Use the provided functions to find products based on the user's input. Do not assume the site. Ask if you need more information.",
    name: "Gift Shopping Assistant",
    model: "gpt-4o",
    tools: [
        {
          type: "function",
          function: {
            name: "getProducts",
            description: "Get a list of products from Lazada based on keywords",
            parameters: {
              type: "object",
              properties: {
                keywords: {
                  type: "string",
                  description: "Keywords to search for products, e.g., 't-shirt', 'laptop'",
                },
                site: {
                  type: "string",
                  enum: ["my", "sg", "id", "ph", "th", "vn"],
                  description: "The regional site of Lazada to search in.",
                },
                sort: {
                  type: "string",
                  enum: ["pop", "priceasc", "pricedesc", "new"],
                  description: "Sort order for the products.",
                  default: "pop",
                },
                page: {
                  type: "integer",
                  description: "Page number of the results",
                  default: 1,
                },
              },
              required: ["keywords", "site"],
            },
          },
        },
      ],
  });
  return Response.json({ assistantId: assistant.id });
}
