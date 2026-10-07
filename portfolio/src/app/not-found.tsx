import Link from "next/link";

export default function NotFound() {
  return (
    <div className="layout-grid gap-y-8 section-pad">
      <p className="col-span-full font-mono text-label text-dust uppercase">Error — Part not found</p>
      <h1 className="col-span-full font-display text-display-xl font-black uppercase">404</h1>
      <p className="col-span-full max-w-measure">This drawing has no sheet at that address.</p>
      <Link href="/" className="col-span-full font-mono text-label uppercase underline underline-offset-4">
        ← Back to index
      </Link>
    </div>
  );
}
