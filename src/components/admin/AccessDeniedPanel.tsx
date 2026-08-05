import { ShieldAlert } from "lucide-react";

export default function AccessDeniedPanel({ module }: { module: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-red-400/20 bg-red-400/5">
        <ShieldAlert className="h-6 w-6 text-red-400" strokeWidth={1.75} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">Access Denied</h2>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">You don't have permission to view the {module} section. Contact a Super Admin if you believe this is a mistake.</p>
    </div>
  );
}
