export function successResponse(data: any, message = 'Success') {
  return Response.json({
    success: true,
    data,
    message,
  });
}

export function createdResponse(data: any, message = 'Created successfully') {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      message,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  );
}

export function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

export function validationErrorResponse(errors: any) {
  return new Response(
    JSON.stringify({
      success: false,
      errors,
    }),
    { status: 422, headers: { 'Content-Type': 'application/json' } }
  );
}

export function notFoundResponse(message = 'Not found') {
  return errorResponse(message, 404);
}

export function serverErrorResponse(error: any) {
  console.error('Server error:', error);
  return errorResponse('Internal server error', 500);
}
