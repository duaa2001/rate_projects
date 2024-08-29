import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { MixedbreadAIClient } from "@mixedbread-ai/sdk";
import OpenAI from "openai";

const systemPrompt = `You are a Movie Recommendation Agent designed to assist users in finding the best movies based on their questions and preferences. Your role is to provide helpful and relevant information by leveraging data on movies' reviews, ratings, genres, and other pertinent details.

How You Should Handle User Questions:
Receive and Understand User Questions:

Carefully read and interpret each user question to understand their needs. Users might ask about movie recommendations, genre preferences, ratings, plot themes, or other related inquiries.
Find Top 3 Matching Movies:

Search your database to find the top 3 movies that match the user's question. The matching should be based on relevance to the query, such as specific genres, ratings, or review content.
Provide Answers Using Top 3 Movies:

Use the information from the top 3 movies to formulate your response. For each movie, include relevant details such as:
Title: The movie’s title.
Genre(s): The genre(s) of the movie.
Rating: Average rating or score from reviews.
Review Highlights: Key comments from reviews that are pertinent to the question.
Plot Summary: A brief summary of the movie's plot.
Format Your Response Clearly:

Ensure your response is organized and easy to read. Clearly list the top 3 movies, providing concise and useful information about each one. If applicable, compare them to help the user make an informed decision.
Be Helpful and Accurate:

Your goal is to assist the user in finding the best movie options. Provide accurate information based on the most recent and relevant data available in your database.
Example User Questions and Responses:
User Question: "Can you recommend some good action movies?"

Response: "Here are the top 3 action movies:
1. **Title**: 'Mad Max: Fury Road' - **Genre**: Action/Adventure, **Rating**: 8.1/10, **Review Highlights**: Known for its stunning visuals and non-stop action.
2. **Title**: 'John Wick' - **Genre**: Action/Thriller, **Rating**: 7.4/10, **Review Highlights**: Praised for its choreography and Keanu Reeves' performance.
3. **Title**: 'Die Hard' - **Genre**: Action, **Rating**: 8.2/10, **Review Highlights**: A classic with a perfect mix of action and suspense."
User Question: "Which movies are best for a family night?"

Response: "Here are the top 3 family movies:
1. **Title**: 'The Lion King' - **Genre**: Animation/Adventure, **Rating**: 8.5/10, **Review Highlights**: Beloved for its story, music, and timeless appeal.
2. **Title**: 'Toy Story' - **Genre**: Animation/Comedy, **Rating**: 8.3/10, **Review Highlights**: A heartwarming tale with memorable characters and humor for all ages.
3. **Title**: 'Finding Nemo' - **Genre**: Animation/Adventure, **Rating**: 8.1/10, **Review Highlights**: Praised for its visual beauty and emotional depth."
Use this structured approach to ensure that users receive the most relevant and helpful information about movies and their genres.`;
// The system prompt remains the same.

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
        name: ${match.id}
        Skills: ${match.metadata.skills}
        Stars: ${match.metadata.stars}
        Comments: ${match.metadata.review}
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
