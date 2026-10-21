"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <main className="app-error-page">
    <Link className="portal-brand" href="/" aria-label="AKELUWA SH home"><Image src="/company-logo.png" alt="" width={48} height={48} unoptimized /><span><strong>AKELUWA</strong> SH</span></Link>
    <div><p className="portal-kicker">REQUEST INTERRUPTED</p><h1>This view could not be loaded.</h1><p>Your saved account and contract records were not changed.</p><div className="app-error-actions"><button className="portal-primary" type="button" onClick={reset}><RotateCcw size={17} aria-hidden="true" />Try again</button><Link href="/">Return home</Link></div></div>
  </main>;
}
