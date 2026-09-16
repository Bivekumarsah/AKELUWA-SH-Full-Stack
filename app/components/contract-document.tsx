"use client";

import Image from "next/image";
import { Contract } from "@/app/lib/api";

const sections: Array<[keyof Contract, string]> = [
  ["scope", "1. Scope of work"], ["deliverables", "2. Deliverables"], ["milestones", "3. Milestones and schedule"],
  ["payment_terms", "4. Payment terms"], ["revision_terms", "5. Revisions and change requests"], ["support_terms", "6. Support and maintenance"],
  ["ownership_terms", "7. Intellectual property and ownership"], ["confidentiality_terms", "8. Confidentiality"],
  ["termination_terms", "9. Termination"], ["dispute_terms", "10. Governing law and disputes"], ["special_terms", "11. Additional terms"],
];

export default function ContractDocument({ contract }: { contract: Contract }) {
  return <article className="contract-paper" id={`contract-${contract.id}`}>
    <header><div><span>AKELUWA SH / PROJECT AGREEMENT</span><h2>{contract.title}</h2></div><div><strong>{contract.contract_number}</strong><span>Version {contract.version}</span><b className={`contract-status status-${contract.status}`}>{contract.status}</b></div></header>
    <section className="contract-summary"><div><span>Service provider</span><strong>{contract.provider_name}</strong></div><div><span>Client</span><strong>{contract.client_name}</strong><small>{contract.client_company || contract.client_email}</small></div><div><span>Project period</span><strong>{contract.start_date} to {contract.end_date}</strong></div><div><span>Contract value</span><strong>{contract.currency} {(contract.amount_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div></section>
    <p className="contract-intro">This project agreement records the services, responsibilities, schedule, fees, and acceptance terms agreed between the service provider and client identified above.</p>
    <div className="contract-clauses">{sections.filter(([key]) => contract[key]).map(([key, title]) => <section key={key}><h3>{title}</h3><p>{String(contract[key])}</p></section>)}</div>
    <section className="contract-acceptance"><h3>Acceptance record</h3><p>Each signature records electronic acceptance of this exact version. The fingerprint below can be used to identify the locked contract content.</p><code>{contract.content_hash || "Generated when the contract is sent"}</code><div className="contract-signatures"><SignatureRecord label="For the service provider" name={contract.provider_signer_name} signature={contract.provider_signature} signedAt={contract.provider_signed_at} /><SignatureRecord label="For the client" name={contract.client_signer_name} signature={contract.client_signature} signedAt={contract.client_signed_at} /></div></section>
    <footer>This electronic acceptance record is not represented as a licensed certificate-based digital signature. Parties should obtain legal review for their jurisdiction and risk level.</footer>
  </article>;
}

function SignatureRecord({ label, name, signature, signedAt }: { label: string; name: string; signature?: string; signedAt?: string }) {
  return <div><span>{label}</span>{signature ? <Image src={signature} alt={`${name} signature`} width={260} height={90} unoptimized /> : <i>Awaiting signature</i>}<strong>{name || "Not signed"}</strong><small>{signedAt ? new Date(signedAt).toLocaleString() : ""}</small></div>;
}
