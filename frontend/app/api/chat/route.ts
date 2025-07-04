import { NextRequest, NextResponse } from 'next/server';

// Get API URL from environment variable or use default
// Use explicit IP address instead of localhost to avoid IPv6 issues
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract required parameters
    const { user_message, developer_message, model, use_rag } = body;

    // Validate required parameters
    if (!user_message) {
      return NextResponse.json(
        { error: 'User message is required' },
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
        use_rag,
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

    // Use a simpler approach for streaming that ensures proper completion
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json(
        { error: 'No response body from API' },
        { status: 500 }
      );
    }

    // Create a new stream that will be returned to the client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('Starting to process stream...');

          // Process chunks until done
          while (true) {
            const { done, value } = await reader.read();

            // If the stream is done, close the controller and break the loop
            if (done) {
              console.log('Stream processing complete');
              // Add an explicit end marker to signal completion to the client
              // Use a special non-visible marker that won't be displayed in the UI
              controller.enqueue(
                new TextEncoder().encode('__STREAM_COMPLETE__')
              );
              controller.close();
              break;
            }

            // Log and forward the chunk
            if (value) {
              console.log(`Received chunk of size: ${value.length} bytes`);
              controller.enqueue(value);
            }
          }
        } catch (error) {
          console.error('Error in stream processing:', error);
          controller.error(error);
        }
      },

      // This is called if the stream is canceled
      async cancel() {
        console.log('Stream was canceled by the client');
        reader.cancel();
      },
    });

    // Return the stream with appropriate headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
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
