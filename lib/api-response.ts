/**
 * API Response Helper Functions
 * Standardized response format for all API endpoints
 */

interface ErrorDetail {
  path: (string | number)[];
  message: string;
  code?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ErrorDetail[];
  message?: string;
}

/**
 * Success Response - for successful operations
 */
export function successResponse<T>(
  data: T,
  message?: string
): Response {  // Changed from ApiResponse<T>
  return Response.json({
    success: true,
    data,
    message: message || 'Operation successful',
  });
}

/**
 * Created Response - for successful resource creation (201)
 */
export function createdResponse<T>(
  data: T,
  message?: string
): Response {
  return Response.json(
    {
      success: true,
      data,
      message: message || 'Resource created successfully',
    },
    { status: 201 }
  );
}

/**
 * Error Response - for general errors
 */
export function errorResponse(
  error: string,
  statusCode?: number
): ApiResponse {
  return {
    success: false,
    error,
  };
}

/**
 * Validation Error Response - for Zod validation failures
 */
export function validationErrorResponse(
  errors: any[]
): Response {
  const formattedErrors = errors.map((error: any) => ({
    path: error.path || [],
    message: error.message || 'Validation error',
    code: error.code || 'VALIDATION_ERROR',
  }));

  return Response.json(
    {
      success: false,
      error: 'Validation failed',
      errors: formattedErrors,
    },
    { status: 400 }
  );
}

/**
 * Not Found Response - for 404 errors
 */
export function notFoundResponse(message: string = 'Resource not found'): Response {
  return Response.json(
    {
      success: false,
      error: message,
    },
    { status: 404 }
  );
}

/**
 * Server Error Response - for 500 errors
 */
export function serverErrorResponse(error: any): Response {
  console.error('Server error:', error);
  return Response.json(
    {
      success: false,
      error: 'Internal server error',
      message: error?.message || 'An unexpected error occurred',
    },
    { status: 500 }
  );
}

/**
 * Bad Request Response - for 400 errors
 */
export function badRequestResponse(message: string): Response {
  return Response.json(
    {
      success: false,
      error: message,
    },
    { status: 400 }
  );
}

/**
 * Unauthorized Response - for 401 errors
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): Response {
  return Response.json(
    {
      success: false,
      error: message,
    },
    { status: 401 }
  );
}

/**
 * Forbidden Response - for 403 errors
 */
export function forbiddenResponse(message: string = 'Forbidden'): Response {
  return Response.json(
    {
      success: false,
      error: message,
    },
    { status: 403 }
  );
}

/**
 * Conflict Response - for 409 errors (duplicate, conflict)
 */
export function conflictResponse(message: string): Response {
  return Response.json(
    {
      success: false,
      error: message,
    },
    { status: 409 }
  );
}