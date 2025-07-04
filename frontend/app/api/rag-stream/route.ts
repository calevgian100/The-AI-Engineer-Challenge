import { NextRequest } from 'next/server';

// Get API URL from environment variable or use default
// Use explicit IP address instead of localhost to avoid IPv6 issues
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, system_prompt } = body;
    
    // Forward the request to the backend API
    const response = await fetch(`${API_URL}/rag-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        system_prompt,
      }),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `RAG stream failed: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a new readable stream that forwards the backend response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
