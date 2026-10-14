import type { Metadata } from "next";
import ContractVerificationTool from "@/app/components/contract-verification";
import { InnerPage } from "@/app/components/inner-page";

export const metadata: Metadata = {
  title: "Verify a Company Record",
  description: "Verify an AKELUWA SH document, certificate, letter, report, approval, or contract ID.",
  alternates: { canonical: "/verify-contract" },
  robots: { index: true, follow: true },
};

export default function VerifyContractPage() {
  return <InnerPage
    eyebrow="RECORDS / VERIFICATION"
    title={<>Verify an issued <em>record.</em></>}
    intro="Check whether a document, certificate, letter, report, approval, or contract belongs to AKELUWA SH."
  >
    <ContractVerificationTool />
  </InnerPage>;
}
