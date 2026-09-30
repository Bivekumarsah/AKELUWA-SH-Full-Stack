import Link from "next/link";
import { InnerPage } from "@/app/components/inner-page";

export default function NotFound() {
  return <InnerPage
    eyebrow="404 / NOT FOUND"
    title={<>That page is not <em>here.</em></>}
    intro="The address may have changed or the requested view may no longer be available."
  >
    <section className="inner-section not-found-action"><Link className="portal-primary" href="/">Return home</Link></section>
  </InnerPage>;
}
