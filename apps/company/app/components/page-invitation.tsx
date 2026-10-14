import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PageInvitation({ title, description }: { title: string; description: string }) {
  return <section className="inner-section page-invitation"><div><h2>{title}</h2><p>{description}</p></div><Link className="company-button" href="/contact">Discuss your project <ArrowRight size={18} aria-hidden="true" /></Link></section>;
}
