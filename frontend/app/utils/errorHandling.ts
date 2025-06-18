/**
 * Utility functions for handling API errors in the frontend
 */

/**
 * Format an error object into a user-friendly message
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred. Please try again.';
};

/**
 * Parse an API error response and extract the error message
 */
export const parseApiError = async (response: Response): Promise<string> => {
  try {
    const contentType = response.headers.get('content-type');
    
    // Handle JSON responses
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      // Handle standard error format
      if (data.error || data.message) {
        return data.error || data.message;
      }
      
      // Handle OpenAI API error format
      if (data.error && data.error.message) {
        return data.error.message;
      }
      
      return JSON.stringify(data);
    }
    
    // Handle text responses
    const text = await response.text();
    return text || `Error: ${response.status} ${response.statusText}`;
  } catch (error) {
    console.error('Error parsing API error:', error);
    return `Error: ${response.status} ${response.statusText}`;
  }
};

/**
 * Common API error messages mapped to user-friendly messages
 */
export const API_ERROR_MESSAGES: Record<string, string> = {
  'invalid_api_key': 'Invalid API key. Please check your OpenAI API key and try again.',
  'insufficient_quota': 'You have insufficient quota on your OpenAI account. Please check your billing details.',
  'rate_limit_exceeded': 'Rate limit exceeded. Please try again later.',
  'model_not_found': 'The selected model is not available. Please try another model.',
};
