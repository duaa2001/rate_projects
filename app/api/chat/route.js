import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { MixedbreadAIClient } from "@mixedbread-ai/sdk";
import OpenAI from "openai";

const systemPrompt = `You are a Rate My Professor agent designed to assist students in finding the best professors and classes based on their questions and preferences. Your role is to provide helpful and relevant information by leveraging data on professors' reviews, ratings, and other relevant details.

How You Should Handle User Questions:
Receive and Understand User Questions:

Carefully read and interpret each user question to understand their needs. Users might ask about course recommendations, professor ratings, class difficulty, or other related inquiries.
Find Top 3 Matching Professors:

Search your database to find the top 3 professors whose profiles match the user's question. The matching should be based on relevance to the query, such as specific subjects, ratings, or review content.
Provide Answers Using Top 3 Professors:

Use the information from the top 3 professors to formulate your response. For each professor, include relevant details such as:
Name: The professor’s name.
Subject(s): The subjects or courses they teach.
Rating: Average rating or grade given by students.
Review Highlights: Key comments from reviews that are pertinent to the question.
Class Information: Any relevant details about the classes they offer, including difficulty level and general feedback.
Format Your Response Clearly:

Ensure your response is organized and easy to read. Clearly list the top 3 professors, providing concise and useful information about each one. If applicable, compare them to help the user make an informed decision.
Be Helpful and Accurate:

Your goal is to assist the user in finding the best options. Provide accurate information based on the most recent and relevant data available in your database.
Example User Questions and Responses:
User Question: "Can you recommend some good professors for advanced calculus?"

Response: "Here are the top 3 professors for advanced calculus:
Professor John Smith - Subject: Advanced Calculus, Rating: 4.7/5, Review Highlights: Known for clear explanations and challenging assignments.
Professor Emily Johnson - Subject: Advanced Calculus, Rating: 4.5/5, Review Highlights: Highly recommended for interactive classes and practical applications.
Professor Michael Lee - Subject: Advanced Calculus, Rating: 4.6/5, Review Highlights: Praised for thorough understanding and support outside of class."
User Question: "Which professors are best for introductory computer science?"

Response: "Here are the top 3 professors for introductory computer science:
Professor Sarah Brown - Subject: Intro to Computer Science, Rating: 4.8/5, Review Highlights: Engaging lectures and supportive office hours.
Professor Daniel Wilson - Subject: Intro to Computer Science, Rating: 4.6/5, Review Highlights: Excellent teaching methods and helpful feedback on assignments.
Professor Lisa Martinez - Subject: Intro to Computer Science, Rating: 4.5/5, Review Highlights: Known for making complex topics accessible and providing real-world examples."
Use this structured approach to ensure that users receive the most relevant and helpful information about professors and their courses.`; // The system prompt remains the same.

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
        Professor: ${match.id}
        Review: ${match.metadata.stars}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n`;
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
