import { NextRequest, NextResponse } from 'next/server';

// Get the API URL from environment or use default - use explicit IP address to avoid IPv6 issues
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  // Log the source parameter to identify which component is making the request
  const source = request.nextUrl.searchParams.get('source') || 'unknown';
  console.log(`[${new Date().toISOString()}] list-pdfs API called from source: ${source}`);

  try {
    console.log(`[${new Date().toISOString()}] Sending list PDFs request to: ${API_URL}/api/list-pdfs`);
    
    // Try a direct connection with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const backendResponse = await fetch(`${API_URL}/api/list-pdfs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      console.error(`Error fetching PDFs: ${backendResponse.status} ${backendResponse.statusText}`);
      throw new Error(`Error: ${backendResponse.status} ${backendResponse.statusText}`);
    }

    const data = await backendResponse.json();
    console.log(`[${new Date().toISOString()}] PDF data received from backend:`, JSON.stringify(data));
    
    // Always ensure we have a pdfs array, even if empty
    if (!data.pdfs) {
      console.warn('Backend response missing pdfs array, adding empty array');
      data.pdfs = [];
    }
    
    // Add mock PDFs for testing if no PDFs were returned
    if (data.pdfs.length === 0) {
      console.log('No PDFs returned from backend, adding mock PDFs for testing');
      data.pdfs = [
        {
          file_id: 'mock-pdf-1',
          filename: 'Mock PDF 1.pdf',
          num_chunks: 10,
          status: 'completed'
        },
        {
          file_id: 'mock-pdf-2',
          filename: 'Mock PDF 2.pdf',
          num_chunks: 5,
          status: 'processing'
        },
        {
          file_id: 'mock-pdf-3',
          filename: 'Mock PDF 3.pdf',
          num_chunks: 0,
          status: 'unknown'
        }
      ];
    }
    
    // Add strong cache headers to prevent frequent requests
    const apiResponse = NextResponse.json(data);
    // Cache for 5 minutes unless explicitly refreshed
    apiResponse.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    apiResponse.headers.set('Expires', new Date(Date.now() + 300000).toUTCString());
    return apiResponse;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching PDFs:`, error);
    
    // Return mock data on error for testing
    const mockData = {
      pdfs: [
        {
          file_id: 'error-mock-pdf',
          filename: 'Error Recovery PDF.pdf',
          num_chunks: 3,
          status: 'completed'
        }
      ]
    };
    
    console.log('Returning mock data due to error');
    const errorResponse = NextResponse.json(mockData);
    // Cache for 5 minutes unless explicitly refreshed
    errorResponse.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    errorResponse.headers.set('Expires', new Date(Date.now() + 300000).toUTCString());
    return errorResponse;
  }
}
