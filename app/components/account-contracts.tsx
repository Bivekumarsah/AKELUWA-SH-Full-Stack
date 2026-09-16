"use client";

import { useState } from "react";
import ContractDocument from "@/app/components/contract-document";
import SignaturePad from "@/app/components/signature-pad";
import { apiFetch, Contract, readableError, User } from "@/app/lib/api";

export default function AccountContracts({ initialContracts, user }: { initialContracts: Contract[]; user: User }) {
  const [contracts, setContracts] = useState(initialContracts);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [signerName, setSignerName] = useState(user.name);
  const [signature, setSignature] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);

  async function sign() {
    if (!selected || !accepted || !signature || signerName.trim().length < 2) { setError("Review the agreement, confirm acceptance, enter your name, and draw your signature."); return; }
    setSigning(true); setError("");
    try {
      const { contract } = await apiFetch<{ contract: Contract }>(`/account/contracts/${selected.id}/sign`, { method: "POST", body: JSON.stringify({ signer_name: signerName, signature }) });
      setContracts((current) => current.map((item) => item.id === contract.id ? contract : item)); setSelected(contract); setSignature(""); setAccepted(false);
    } catch (requestError) { setError(readableError(requestError)); } finally { setSigning(false); }
  }

  if (selected) return <section className="account-contract-view"><div className="contract-view-actions"><button type="button" onClick={() => setSelected(null)}>Back to account</button><button type="button" onClick={() => window.print()}>Print / Save PDF</button></div><ContractDocument contract={selected} />{selected.status === "pending" && !selected.client_signed_at && <section className="contract-sign-panel"><p className="portal-kicker">ELECTRONIC ACCEPTANCE</p><h2>Review, then sign.</h2><p>Your signature records acceptance of contract {selected.contract_number}, version {selected.version}, with fingerprint <code>{selected.content_hash}</code>.</p><label>Full legal name<input value={signerName} onChange={(event) => setSignerName(event.target.value)} /></label><SignaturePad onChange={setSignature} /><label className="contract-consent"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>I have read this complete agreement, understand its terms, have authority to accept it, and consent to using an electronic signature and record.</span></label>{error && <p className="form-alert is-error">{error}</p>}<button className="portal-primary" type="button" onClick={sign} disabled={signing}>{signing ? "Recording acceptance..." : "Accept and sign contract"}</button></section>}</section>;
  return <section className="account-contracts"><div className="panel-heading"><div><span>PROJECT CONTRACTS</span><strong>{contracts.length.toString().padStart(2, "0")}</strong></div></div>{contracts.length === 0 ? <p className="dashboard-state">No contracts have been issued to your account.</p> : contracts.map((item) => <button type="button" key={item.id} onClick={() => setSelected(item)}><div><span>{item.contract_number}</span><strong>{item.title}</strong><small>{item.currency} {(item.amount_cents / 100).toLocaleString()} · ends {item.end_date}</small></div><b className={`contract-status status-${item.status}`}>{item.status}</b></button>)}</section>;
}
