import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Helper to convert any error type to string message
function getErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error_description) return error.error_description;
  if (Array.isArray(error)) {
    return error.map((e: any) => e.message || String(e)).join(', ');
  }
  return String(error);
}

// ✅ SUCCESS RESPONSES - Flexible parameter handling
export function successResponse<T = any>(
  arg1?: string | T | number,
  arg2?: T | string | number,
  arg3?: number
): NextResponse {
  let message: string = 'Success';
  let data: T | undefined;
  let status: number = 200;

  // Detect parameter types and handle all cases:
  // successResponse(data)
  // successResponse(message, data)
  // successResponse(data, message)
  // successResponse(message, data, status)
  
  if (arg1 === undefined) {
    // No args
  } else if (typeof arg1 === 'string') {
    // First arg is string (message)
    message = arg1;
    if (typeof arg2 === 'number') {
      status = arg2;
    } else if (arg2 !== undefined) {
      data = arg2 as T;
      if (typeof arg3 === 'number') {
        status = arg3;
      }
    }
  } else if (typeof arg1 === 'number') {
    // First arg is number (status)
    status = arg1;
  } else {
    // First arg is data
    data = arg1 as T;
    if (typeof arg2 === 'string') {
      message = arg2;
      if (typeof arg3 === 'number') {
        status = arg3;
      }
    } else if (typeof arg2 === 'number') {
      status = arg2;
    }
  }

  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

export function createdResponse<T = any>(
  arg1?: string | T,
  arg2?: T | string,
  status: number = 201
): NextResponse {
  let message: string = 'Created';
  let data: T | undefined;

  if (typeof arg1 === 'string') {
    message = arg1;
    data = arg2 as T;
  } else if (arg1 !== undefined) {
    data = arg1 as T;
    if (typeof arg2 === 'string') {
      message = arg2;
    }
  }

  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

// ✅ SPECIAL RESPONSE FOR STORES - Returns "stores" key instead of "data"
export function storesResponse<T = any>(
  arg1?: string | T | number,
  arg2?: T | string | number,
  arg3?: number
): NextResponse {
  let message: string = 'Success';
  let data: T | undefined;
  let status: number = 200;

  if (arg1 === undefined) {
    // No args
  } else if (typeof arg1 === 'string') {
    message = arg1;
    if (typeof arg2 === 'number') {
      status = arg2;
    } else if (arg2 !== undefined) {
      data = arg2 as T;
      if (typeof arg3 === 'number') {
        status = arg3;
      }
    }
  } else if (typeof arg1 === 'number') {
    status = arg1;
  } else {
    data = arg1 as T;
    if (typeof arg2 === 'string') {
      message = arg2;
      if (typeof arg3 === 'number') {
        status = arg3;
      }
    } else if (typeof arg2 === 'number') {
      status = arg2;
    }
  }

  return NextResponse.json(
    {
      success: true,
      message,
      stores: data,  // ← Returns "stores" key instead of "data"
    },
    { status }
  );
}

// ✅ ERROR RESPONSES
export function errorResponse(message: string | any = 'An error occurred', status: number = 400): NextResponse {
  const finalMessage = getErrorMessage(message);
  return NextResponse.json(
    {
      success: false,
      message: finalMessage,
      error: finalMessage,
    },
    { status }
  );
}

export function validationErrorResponse(message: string | any): NextResponse {
  const finalMessage = getErrorMessage(message);
  return NextResponse.json(
    {
      success: false,
      message: 'Validation error',
      error: finalMessage,
    },
    { status: 422 }
  );
}

export function unauthorizedResponse(message: string | any = 'Unauthorized'): NextResponse {
  const finalMessage = getErrorMessage(message);
  return NextResponse.json(
    {
      success: false,
      message: finalMessage,
      error: finalMessage,
    },
    { status: 401 }
  );
}

export function forbiddenResponse(message: string | any = 'Forbidden'): NextResponse {
  const finalMessage = getErrorMessage(message);
  return NextResponse.json(
    {
      success: false,
      message: finalMessage,
      error: finalMessage,
    },
    { status: 403 }
  );
}

export function notFoundResponse(message: string | any = 'Not found'): NextResponse {
  const finalMessage = getErrorMessage(message);
  return NextResponse.json(
    {
      success: false,
      message: finalMessage,
      error: finalMessage,
    },
    { status: 404 }
  );
}

export function conflictResponse(message: string | any = 'Conflict'): NextResponse {
  const finalMessage = getErrorMessage(message);
  return NextResponse.json(
    {
      success: false,
      message: finalMessage,
      error: finalMessage,
    },
    { status: 409 }
  );
}

export function serverErrorResponse(message: string | any, error?: any): NextResponse {
  const finalMessage = getErrorMessage(message);
  console.error('Server error:', error);
  return NextResponse.json(
    {
      success: false,
      message: finalMessage,
      error: finalMessage,
    },
    { status: 500 }
  );
}

// Export the helper for use in routes if needed
export { getErrorMessage };