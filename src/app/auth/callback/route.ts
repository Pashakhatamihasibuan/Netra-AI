import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const roleRoutes: Record<string, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  parent:  '/parent/dashboard',
  admin:   '/admin/dashboard',
};

export async function GET(request: Request) {
  const url  = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  const cookieStore = cookies();
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookiesToSet.push({ name, value, options });
        },
        remove(name: string, options: CookieOptions) {
          cookiesToSet.push({ name, value: '', options });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error('[auth/callback] exchangeCodeForSession error:', error?.message);
    return NextResponse.redirect(new URL('/login?error=oauth_failed', request.url));
  }

  // Gunakan service role agar bypass RLS (session cookie belum tersedia di sini).
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // FIX: Pakai .maybeSingle() bukan .single().
  // .single() melempar error jika hasil = 0 baris ATAU > 1 baris.
  // "Cannot coerce the result to a single JSON object" muncul karena ada
  // duplikat row di public.users (trigger race condition),
  // atau row belum ada karena trigger belum selesai.
  // .maybeSingle() mengembalikan null jika 0 baris, dan mengambil baris
  // pertama jika ada duplikat — tidak pernah throw error karena jumlah baris.
  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[auth/callback] profile fetch error:', profileError.message);
  }

  // Jika row belum ada (trigger belum selesai saat flow sangat cepat),
  // fallback ke metadata. Metadata sudah di-sync oleh trigger yang sama jika ada.
  let role = profile?.role as string | undefined;

  if (!role) {
    // Coba baca dari metadata auth.users sebagai fallback
    const meta = data.user.user_metadata ?? {};
    const metaRole = meta.role as string | undefined;
    if (metaRole && roleRoutes[metaRole]) {
      role = metaRole;
    }
  }

  // Jika masih tidak ada role yang valid, tunggu sebentar lalu coba sekali lagi.
  // Ini handle race condition di mana trigger DB belum selesai insert.
  if (!role) {
    await new Promise((r) => setTimeout(r, 600));
    const { data: retryProfile } = await adminClient
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    role = retryProfile?.role as string | undefined;
  }

  // BUG FIX (root cause dari "pilih Guru/Orang tua tapi masuk dashboard Siswa"):
  // DB — trigger selalu fallback ke 'student'.
  //
  // Di sini kita terapkan role tersebut KE public.users DAN auth.users
  // metadata — tapi HANYA jika akun ini baru pertama kali dibuat barusan.
  // Tanpa pengecekan ini, siapa pun bisa "naik" jadi guru/orang tua hanya
  // dengan klik tombol berbeda di login berikutnya, walau akunnya sudah
  // terdaftar sebagai siswa — itu celah keamanan/role-escalation, bukan fix.
  //
  // Cara deteksi "baru dibuat": Supabase set created_at == last_sign_in_at
  // (selisih sangat kecil) pada login pertama. Pada login
  // berikutnya, created_at tetap di masa lalu sementara last_sign_in_at maju.
  const requestedRole = url.searchParams.get('role');
  const createdAtMs   = new Date(data.user.created_at).getTime();
  const lastSignInMs  = data.user.last_sign_in_at
    ? new Date(data.user.last_sign_in_at).getTime()
    : createdAtMs;
  const isBrandNewAccount = Math.abs(lastSignInMs - createdAtMs) < 10_000;

  if (
    isBrandNewAccount &&
    requestedRole &&
    roleRoutes[requestedRole] &&
    requestedRole !== role // tidak perlu update kalau sudah sama (mis. 'student')
  ) {
    const { error: roleUpdateError } = await adminClient
      .from('users')
      .update({ role: requestedRole })
      .eq('id', data.user.id);

    if (roleUpdateError) {
      console.error('[auth/callback] gagal set role akun baru:', roleUpdateError.message);
    } else {
      // Sync ke auth.users metadata juga, agar middleware (yang baca
      // user_metadata.role) konsisten dengan public.users.
      await adminClient.auth.admin.updateUserById(data.user.id, {
        user_metadata: { ...(data.user.user_metadata ?? {}), role: requestedRole },
      });
      role = requestedRole;
    }
  }

  const destination = (role && roleRoutes[role]) ? roleRoutes[role] : next;

  const response = NextResponse.redirect(new URL(destination, request.url));

  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set({ name, value, ...options });
  }

  return response;
}
