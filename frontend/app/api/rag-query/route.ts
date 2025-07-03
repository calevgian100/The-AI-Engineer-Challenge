import { NextRequest, NextResponse } from 'next/server';

// Get API URL from environment variable or use default
// Use explicit IP address instead of localhost to avoid IPv6 issues
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, system_prompt } = body;
    
    const response = await fetch(`${API_URL}/rag-query`, {
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
      return NextResponse.json(
        { error: `RAG query failed: ${response.status}` }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Ensure the response has the expected format
    if (!data.answer) {
      return NextResponse.json(
        { error: 'Invalid RAG response format' }, 
        { status: 500 }
      );
    }
    
    // Process sources if they exist
    if (data.sources && Array.isArray(data.sources)) {
      const processedSources = data.sources.map((source: any) => ({
        text: source.text || '',
        source: source.source || 'Unknown',
        score: typeof source.score === 'number' ? source.score : 0
      }));
      
      return NextResponse.json({
        answer: data.answer,
        sources: processedSources
      });
    }
    
    // Return the data as is if no sources or not in expected format
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
