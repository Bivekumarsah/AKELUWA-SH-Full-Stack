"use client";
import { useEffect, useState } from "react";
import { API_BASE_URL, apiFetch, DownloadResource } from "@/app/lib/api";
function fileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
export default function PublicDownloads() {
  const [items, setItems] = useState<DownloadResource[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch<{ downloads: DownloadResource[] }>("/downloads").then((data) => setItems(data.downloads)).finally(() => setLoading(false)); }, []);
  if (loading) return <section className="inner-section"><p className="dashboard-state">Loading resources...</p></section>;
  return <section className="inner-section case-grid resource-grid">{items.length ? items.map((item) => <article className="inner-card resource-card" key={item.id}><span>{item.content_type.split("/").pop()?.toUpperCase()} · {fileSize(item.file_size)}</span><h2>{item.title}</h2><p>{item.description}</p><div><small>{item.download_count} downloads</small><a className="inner-link" href={`${API_BASE_URL}/downloads/${item.id}/file`}>Download file <span aria-hidden="true">↓</span></a></div></article>) : <article className="inner-card"><span>RESOURCES</span><h2>Documents are being prepared.</h2><p>Published company and project materials will appear here.</p></article>}</section>;
}
