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

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
      }

      // Give the client a brief moment to auto-detect a fragment-based
      // session (it parses window.location.hash on load).
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(next);
        return;
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
