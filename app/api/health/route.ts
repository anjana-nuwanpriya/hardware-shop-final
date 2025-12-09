import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1);

    if (error) {
      return Response.json(
        { 
          status: 'error', 
          message: 'Database error',
          error: error.message 
        },
        { status: 500 }
      );
    }

    return Response.json({
      status: 'ok',
      message: 'Database connected successfully!',
      timestamp: new Date().toISOString(),
      data: data,
    });
  } catch (error) {
    return Response.json(
      { 
        status: 'error', 
        message: String(error) 
      },
      { status: 500 }
    );
  }
}