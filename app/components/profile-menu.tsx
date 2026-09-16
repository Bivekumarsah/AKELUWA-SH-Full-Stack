"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { API_BASE_URL, apiFetch, readableError, User } from "@/app/lib/api";

type Props = {
  user: User | null;
  onUserChange: (user: User) => void;
  showAdminLink?: boolean;
};

export default function ProfileMenu({ user, onUserChange, showAdminLink = false }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const initials = (user?.name || "Account").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const avatarURL = user?.avatar_updated_at
    ? `${API_BASE_URL}/account/avatar?v=${encodeURIComponent(user.avatar_updated_at)}`
    : "";

  function beginEdit() {
    setName(user?.name || "");
    setAvatar(null);
    setError("");
    setOpen(false);
    setEditing(true);
  }

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 2 * 1024 * 1024) {
      setError("Profile picture must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }
    setError("");
    setAvatar(file);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      let current = user;
      if (name.trim() !== user.name) {
        const response = await apiFetch<{ user: User }>("/account/profile", {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim() }),
        });
        current = response.user;
      }
      if (avatar) {
        const form = new FormData();
        form.append("avatar", avatar);
        const response = await apiFetch<{ user: User }>("/account/avatar", { method: "POST", body: form });
        current = response.user;
      }
      onUserChange(current);
      setEditing(false);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto() {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const response = await apiFetch<{ user: User }>("/account/avatar", { method: "DELETE" });
      onUserChange(response.user);
      setAvatar(null);
    } catch (requestError) {
      setError(readableError(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST", body: "{}" }).catch(() => undefined);
    window.location.replace("/");
  }

  return (
    <>
      <div className="profile-control" ref={menuRef}>
        <button className="profile-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} aria-label="Open profile menu">
          <span className="profile-avatar">
            {avatarURL ? <Image src={avatarURL} alt="" fill sizes="40px" unoptimized /> : initials}
          </span>
          <span className="profile-trigger-copy"><strong>{user?.name || "Account"}</strong><small>{user?.role || "user"}</small></span>
          <span className="profile-chevron" aria-hidden="true">⌄</span>
        </button>
        {open && (
          <div className="profile-menu" role="menu">
            <div className="profile-menu-head"><strong>{user?.name}</strong><span>{user?.email}</span></div>
            <button type="button" role="menuitem" onClick={beginEdit}>Edit profile</button>
            {showAdminLink && user?.role === "admin" && <Link href="/admin" role="menuitem">Admin dashboard</Link>}
            <button className="profile-signout" type="button" role="menuitem" onClick={logout}>Sign out</button>
          </div>
        )}
      </div>

      {editing && (
        <div className="profile-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(false); }}>
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
            <div className="profile-modal-heading"><div><span>ACCOUNT / PROFILE</span><h2 id="profile-dialog-title">Edit profile</h2></div><button type="button" onClick={() => setEditing(false)} aria-label="Close profile editor">×</button></div>
            <form onSubmit={saveProfile}>
              <label>Display name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label>
              <label>Email<input value={user?.email || ""} readOnly aria-readonly="true" /></label>
              <label>Profile picture<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} /></label>
              <p className="profile-file-note">JPG, PNG or WebP. Maximum 2 MB.{avatar ? ` Selected: ${avatar.name}` : ""}</p>
              {error && <p className="form-alert is-error" role="alert">{error}</p>}
              <div className="profile-modal-actions">
                {user?.avatar_updated_at && <button className="profile-remove" type="button" onClick={removePhoto} disabled={saving}>Remove photo</button>}
                <button className="profile-cancel" type="button" onClick={() => setEditing(false)}>Cancel</button>
                <button className="portal-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
