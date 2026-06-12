import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getServerEnvironment } from '@/lib/env/server';

export async function POST(request: Request) {
  const environment = getServerEnvironment();
  const supabase = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/login', request.url), {
    status: 302,
  });
}
