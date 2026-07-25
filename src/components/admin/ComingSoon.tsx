import AdminHeader from "./AdminHeader";

export default function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <AdminHeader title={title} />
      <div className="p-8">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">This section is being built.</p>
          {note && <p className="mt-2 text-sm text-zinc-600">{note}</p>}
        </div>
      </div>
    </div>
  );
}
