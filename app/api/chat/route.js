import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { MixedbreadAIClient } from "@mixedbread-ai/sdk";
import OpenAI from "openai";

const systemPrompt = `You are a creative Movie Recommendation Agent. Recommend one movie at a time that best matches the user's request, even if it's not a perfect match in the dataset.

**Guidelines:**
1. **Focus on User Preferences:** Match the user's requested genre or criteria as closely as possible. If an exact match isn't available, recommend the closest alternative that aligns with their preferences.

2. **Creative Flexibility:** Use your broader knowledge to suggest a movie that captures the spirit of the user's request, even if it isn't classified exactly as requested.

3. **Clear Recommendation:** For each movie, provide:

   - **Title:** (bolded) 

   (skip line)

   - **Genre:**

   (skip line)

   - **Rating:**

   (skip line)

   - **Brief Summary:**

   (skip line)

   - **Why It's a Good Fit:** Explain briefly why this movie meets the user's needs.


4. Format this so each category is on a separate line.

Your goal is to make the best possible recommendation based on the user's request, even if it requires creative interpretation.`;



export async function POST(req) {
  try {
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = pc.index("rag").namespace("ns1");
    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: `${process.env.OPENAI_API_KEY}`,
    });

    const data = await req.json();

    const mxbai = new MixedbreadAIClient({
      apiKey: `${process.env.MIXEDBREAD_API_KEY}`,
    });

    const text = data[data.length - 1].content;
    const embedding = await mxbai.embeddings({
      model: "mixedbread-ai/mxbai-embed-large-v1",
      input: text,
      encoding_format: "float",
      normalized: true,
      truncation_strategy: "end",
    });

    const results = await index.query({
      topK: 3,
      includeMetadata: true,
      vector: embedding.data[0].embedding,
    });

    let resultString =
      "\n\nReturned results from vector db (done automatically):\n\n";
    results.matches.forEach((match) => {
      resultString += `
  Returned Results:
  title: ${match.id}
  genre: ${match.metadata.genre}
  stars: ${match.metadata.stars}
  reviewer: ${match.metadata.reviewer}
  comments: ${match.metadata.review}
  \n\n`;
      675;
    });


    const lastMessage = data[data.length - 1];
    const lastMessageContent = lastMessage.content + resultString;
    const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: lastMessageContent },
        ...lastDataWithoutLastMessage,
      ],
      model: "openai/gpt-3.5-turbo",
    });

    return new NextResponse(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error in API route:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
