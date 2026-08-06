"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function handle() {
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/";
      const code = searchParams.get("code");

      // Path 1: PKCE code-based flow.
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
      }

      // Path 2: Fragment-based flow — parsed and applied directly and
      // explicitly, not left to automatic detection.
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (!error) {
          router.replace(next);
          return;
        }
      }

      setFailed(true);
    }
    handle();
  }, [router, searchParams]);

  if (failed) {
    router.replace("/login?error=Could not verify link. Please try again.");
    return null;
  }

  return <p className="text-sm text-zinc-500">Verifying your link...</p>;
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
