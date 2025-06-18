import { NextRequest, NextResponse } from 'next/server';

// Get API URL from environment variable or use default
// Use explicit IP address instead of localhost to avoid IPv6 issues
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract required parameters
    const { user_message, developer_message, model } = body;
    
    // Validate required parameters
    if (!user_message) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Forward request to backend API
    console.log(`Sending request to: ${API_URL}/chat`);
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_message,
        developer_message,
        model,
      }),
    });
    
    // Handle error responses
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If response is not JSON, use status text
        return NextResponse.json(
          { error: `API Error: ${response.statusText}` },
          { status: response.status }
        );
      }
      
      // Return error from backend
      return NextResponse.json(
        { error: errorData.error || errorData.message || 'Unknown API error' },
        { status: response.status }
      );
    }
    
    // For streaming responses, create a TransformStream to forward the data
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk);
        controller.enqueue(encoder.encode(text));
      },
    });
    
    // Pipe the response body to our transform stream
    const readableStream = response.body;
    if (!readableStream) {
      return NextResponse.json(
        { error: 'No response from API' },
        { status: 500 }
      );
    }
    
    const reader = readableStream.getReader();
    const writer = transformStream.writable.getWriter();
    
    // Process the stream
    (async () => {
      try {
        console.log('Starting to process stream...');
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream processing complete');
            break;
          }
          console.log(`Received chunk of size: ${value.length} bytes`);
          await writer.write(value);
        }
      } catch (error) {
        console.error('Error processing stream:', error);
      } finally {
        console.log('Closing stream writer');
        await writer.close().catch(err => console.error('Error closing writer:', err));
      }
    })();
    
    // Return the readable part of the transform stream as the response
    return new Response(transformStream.readable, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
