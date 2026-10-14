import Image from "next/image";
import Link from "next/link";

export function AuthBrand() {
  return (
    <Link className="auth-brand" href="/" aria-label="Return to AKELUWA SH">
      <Image src="/company-logo.png" alt="" width={48} height={48} priority unoptimized />
      <span className="auth-wordmark"><strong>AKELUWA</strong><small>Software hub</small></span>
    </Link>
  );
}
