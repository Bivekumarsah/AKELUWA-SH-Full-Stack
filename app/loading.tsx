import Image from "next/image";

export default function Loading() {
  return <main className="app-route-loading" role="status" aria-label="Loading page">
    <Image src="/company-logo.png" alt="" width={54} height={54} unoptimized priority />
    <span>Loading secure view...</span>
  </main>;
}
