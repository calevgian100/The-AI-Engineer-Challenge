import { NextRequest, NextResponse } from 'next/server';

// Get API URL from environment variable or use default
// Use explicit IP address instead of localhost to avoid IPv6 issues
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const { fileId } = params;
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing file ID parameter' },
        { status: 400 }
      );
    }
    
    // Forward the request to the backend API
    console.log(`Checking PDF status for ${fileId} at: ${API_URL}/pdf-status/${fileId}`);
    const response = await fetch(`${API_URL}/pdf-status/${fileId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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
    
    // Return successful response
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
