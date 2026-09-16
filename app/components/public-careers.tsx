"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, Career } from "@/app/lib/api";
export default function PublicCareers() {
  const [items, setItems] = useState<Career[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch<{ careers: Career[] }>("/careers").then((data) => setItems(data.careers)).finally(() => setLoading(false)); }, []);
  if (loading) return <section className="inner-section"><p className="dashboard-state">Loading opportunities...</p></section>;
  return <section className="inner-section career-public-list">{items.length ? items.map((item) => <article key={item.id}><div className="career-meta"><span>{item.department}</span><span>{item.employment_type}</span><span>{item.location}</span></div><h2>{item.title}</h2><p>{item.summary}</p><details><summary>Role details</summary><div><h3>Responsibilities</h3><p>{item.responsibilities}</p><h3>Requirements</h3><p>{item.requirements}</p></div></details><footer>{item.deadline && <small>Apply by {new Date(`${item.deadline}T00:00:00`).toLocaleDateString()}</small>}<Link className="inner-link" href={`/careers/apply?career=${item.id}`}>Apply for this role <span aria-hidden="true">↗</span></Link></footer></article>) : <article className="career-empty"><span>NO OPEN ROLES</span><h2>Stay connected.</h2><p>There are no published openings right now. You can still introduce yourself for future opportunities.</p><a className="inner-link" href="mailto:akeluwasoftwarehub@gmail.com?subject=Career%20interest%20-%20AKELUWA%20SH">Send career interest</a></article>}</section>;
}
