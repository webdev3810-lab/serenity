"use client";

/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */

import { CMS_LIMITS } from "@/src/lib/cmsValidation";
import { ChevronRight,Mail,MessageSquare,Search,UsersRound,X } from "lucide-react";
import { useState } from "react";

import { AdminBadge as StatusBadge,AdminDialog,useAdminPagination,useAdminWorkspace } from "@/src/components/admin/AdminUI";

import { EmptyState,PageHeader } from "./AdminFields";
import { AdminPasswordField } from "./AdminPasswordField";
import { AdminRole,AdminUser,formatDate,Row } from "./AdminModels";
export { ReviewManager } from "./ReviewEditor";

export function EnquiryManager({ enquiries, updateStatus, updateNotes, convert }: { enquiries: Row[]; updateStatus: (enquiry: Row, status: string) => void; updateNotes: (enquiry: Row, notes: string) => Promise<boolean>; convert: (enquiry: Row) => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = enquiries.filter((item) => `${item.company_name} ${item.contact_name} ${item.email}`.toLowerCase().includes(query.toLowerCase()));
  const selected = enquiries.find((item) => String(item.id) === selectedId);
  const { visible, pagination } = useAdminPagination(filtered);
  return <>
    <PageHeader eyebrow="Enquiries" title="Corporate enquiries" description="Respond to companies and project teams with a clear view of each request." />
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-xl"><Search className="admin-search-icon" size={18} aria-hidden="true" /><input className="admin-field admin-search-input" aria-label="Search company, contact, or email" placeholder="Search company, contact, or email" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <p className="text-sm text-[var(--admin-muted)]">{filtered.length} {filtered.length === 1 ? "enquiry" : "enquiries"}</p>
    </div>
    <div className="admin-card admin-inbox-table-shell bg-[var(--admin-surface)]">
      <table className="admin-inbox-table text-left text-sm">
        <thead><tr><th>Company</th><th>Contact</th><th>Stay dates</th><th>Status</th><th>Details</th></tr></thead>
        <tbody>{visible.map((enquiry) => <tr key={String(enquiry.id)}>
          <td data-label="Company"><strong>{String(enquiry.company_name ?? "—")}</strong><small>{String(enquiry.houses_needed || 1)} {String(enquiry.houses_needed || 1) === "1" ? "house" : "houses"}</small></td>
          <td data-label="Contact"><strong>{String(enquiry.contact_name ?? "—")}</strong><small>{String(enquiry.email ?? "")}</small></td>
          <td data-label="Stay dates">{formatDate(enquiry.arrival)} – {formatDate(enquiry.departure)}</td>
          <td data-label="Status"><StatusBadge domain="enquiry" value={enquiry.status || "new"} /></td>
          <td data-label="Details"><button type="button" className="admin-sheet-open" onClick={() => setSelectedId(String(enquiry.id))}>View <ChevronRight size={14} aria-hidden="true" /></button></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <EmptyState icon={MessageSquare} title="No enquiries found" description="New corporate enquiries will appear here." compact />}
    </div>
    {pagination}
    {selected && <InboxPreview key={String(selected.id)} kind="enquiry" item={selected} onClose={() => setSelectedId(null)} updateStatus={updateStatus} updateNotes={updateNotes} convert={convert} />}
  </>;
}

export function ContactManager({ contacts, unavailable, updateStatus, updateNotes }: { contacts: Row[]; unavailable: boolean; updateStatus: (contact: Row, status: string) => void; updateNotes: (contact: Row, notes: string) => Promise<boolean> }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = contacts.filter((item) => `${item.first_name} ${item.last_name} ${item.email} ${item.phone} ${item.message}`.toLowerCase().includes(query.toLowerCase()));
  const selected = contacts.find((item) => String(item.id) === selectedId);

  const { visible, pagination } = useAdminPagination(filtered);
  return <>
    <PageHeader eyebrow="Contacts" title="Customer contact messages" description="Messages sent from the public Contact page. Corporate stay requests remain in the separate Enquiries workspace." />
    {unavailable && <div className="admin-notice is-error mb-4" role="alert"><X size={18} />Contact messages could not be loaded. Refresh to retry.</div>}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-xl"><Search className="admin-search-icon" size={18} aria-hidden="true" /><input className="admin-field admin-search-input" aria-label="Search name, email, phone, or message" placeholder="Search name, email, phone, or message" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <p className="text-sm text-[var(--admin-muted)]">{filtered.length} {filtered.length === 1 ? "message" : "messages"}</p>
    </div>
    <div className="admin-card admin-inbox-table-shell bg-[var(--admin-surface)]">
      <table className="admin-inbox-table text-left text-sm">
        <thead><tr><th>Customer</th><th>Request</th><th>Received</th><th>Status</th><th>Details</th></tr></thead>
        <tbody>{visible.map((contact) => <tr key={String(contact.id)}>
          <td data-label="Customer"><strong>{String(contact.first_name ?? "")} {String(contact.last_name ?? "")}</strong><small>{String(contact.email ?? "")}</small></td>
          <td data-label="Request"><strong>{String(contact.project_type || "General enquiry")}</strong><small>{String(contact.preferred_house || "No preferred house")}</small></td>
          <td data-label="Received">{formatDate(contact.created_at)}</td>
          <td data-label="Status"><StatusBadge domain="enquiry" value={contact.status || "new"} /></td>
          <td data-label="Details"><button type="button" className="admin-sheet-open" onClick={() => setSelectedId(String(contact.id))}>View <ChevronRight size={14} aria-hidden="true" /></button></td>
        </tr>)}</tbody>
      </table>
      {!unavailable && !filtered.length && <EmptyState icon={Mail} title={query ? "No messages found" : "No customer messages"} description={query ? "Try a different name, email address, or phrase." : "Messages sent from the public Contact page will appear here."} compact />}
    </div>
    {pagination}
    {selected && <InboxPreview key={String(selected.id)} kind="contact" item={selected} onClose={() => setSelectedId(null)} updateStatus={updateStatus} updateNotes={updateNotes} />}
  </>;
}

function InboxPreview({ kind, item, onClose, updateStatus, updateNotes, convert }: {
  kind: "enquiry" | "contact";
  item: Row;
  onClose: () => void;
  updateStatus: (item: Row, status: string) => void;
  updateNotes: (item: Row, notes: string) => Promise<boolean>;
  convert?: (item: Row) => void;
}) {
  const { confirm } = useAdminWorkspace();
  const [notes, setNotes] = useState(String(item.internal_notes ?? ""));
  const [savedNotes, setSavedNotes] = useState(String(item.internal_notes ?? ""));
  const [saving, setSaving] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");
  const isEnquiry = kind === "enquiry";
  const name = isEnquiry ? String(item.company_name ?? "Corporate enquiry") : `${String(item.first_name ?? "")} ${String(item.last_name ?? "")}`.trim();
  const close = async () => {
    if (saving) return;
    if (notes !== savedNotes && !await confirm({ title: "Discard internal note changes?", description: "Your unsaved note will be lost.", confirmLabel: "Discard changes", destructive: true })) return;
    onClose();
  };
  const saveNotes = async () => {
    if (saving || notes === savedNotes) return;
    setSaving(true);
    setNoteMessage("");
    try {
      if (await updateNotes(item, notes)) {
        setSavedNotes(notes);
        setNoteMessage("Internal note saved.");
      } else setNoteMessage("Could not save the note. Try again.");
    } catch { setNoteMessage("Could not save the note. Try again."); }
    finally { setSaving(false); }
  };
  return <AdminDialog label={`${isEnquiry ? "Enquiry" : "Contact"} details`} className="admin-inbox-dialog" busy={saving} onClose={() => void close()}>
    <article className="admin-inbox-dialog-content">
      <header className="admin-inbox-dialog-header"><div><p>{isEnquiry ? "Corporate enquiry" : "Contact message"}</p><h2>{name}</h2><div className="admin-inbox-dialog-meta"><span>{String(item.reference ?? "")}</span><StatusBadge domain="enquiry" value={item.status || "new"} /></div></div><button type="button" className="admin-reservation-dialog-close" onClick={() => void close()} disabled={saving} aria-label="Close details"><X size={18} /></button></header>
      <div className="admin-inbox-dialog-body">
        <dl className="admin-inbox-dialog-details">
          {isEnquiry ? <><InboxFact label="Contact" value={String(item.contact_name ?? "—")} /><InboxFact label="Email" value={String(item.email ?? "—")} /><InboxFact label="Phone" value={String(item.phone || "—")} /><InboxFact label="Stay dates" value={`${formatDate(item.arrival)} – ${formatDate(item.departure)}`} /><InboxFact label="Houses needed" value={String(item.houses_needed || "1")} /><InboxFact label="Guests" value={String(item.guests || "—")} /><InboxFact label="Purpose" value={String(item.purpose || "—")} /><InboxFact label="Received" value={formatDate(item.created_at)} /></> : <><InboxFact label="Email" value={String(item.email ?? "—")} /><InboxFact label="Phone" value={String(item.phone || "—")} /><InboxFact label="Stay type" value={String(item.project_type || "—")} /><InboxFact label="Preferred house" value={String(item.preferred_house || "—")} /><InboxFact label="Received" value={formatDate(item.created_at)} /></>}
        </dl>
        {(isEnquiry ? Boolean(item.notes) : true) && <section className="admin-inbox-message"><h3>{isEnquiry ? "Guest notes" : "Message"}</h3><p>{String(isEnquiry ? item.notes : item.message || "—")}</p></section>}
        <section className="admin-inbox-update"><label>Status<select className="admin-field" value={String(item.status || "new")} onChange={(event) => updateStatus(item, event.target.value)}>{(isEnquiry ? ["new", "contacted", "pending_approval", "approved", "declined", "converted"] : ["new", "contacted", "closed", "spam"]).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>{isEnquiry && item.status === "approved" && convert && <button type="button" className="admin-button admin-button-primary" onClick={() => convert(item)}>Convert to bookings</button>}</section>
        <section className="admin-inbox-notes"><label htmlFor={`internal-note-${kind}-${item.id}`}>Internal notes <span>Only your team can see these.</span></label><textarea id={`internal-note-${kind}-${item.id}`} className="admin-field" maxLength={CMS_LIMITS.admin_notes} value={notes} onChange={(event) => { setNotes(event.target.value); setNoteMessage(""); }} placeholder="Add a private note" /><div><p role="status">{noteMessage}</p><button type="button" className="admin-button admin-button-primary" disabled={saving || notes === savedNotes} onClick={() => void saveNotes()}>{saving ? "Saving…" : "Save note"}</button></div></section>
      </div>
    </article>
  </AdminDialog>;
}

function InboxFact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }

export function AdminUserManager({ users, currentUserEmail, createUser, updateUser, deleteUser }: { users: AdminUser[]; currentUserEmail: string; createUser: (details: { email: string; username: string; password: string; role: AdminRole }) => Promise<void>; updateUser: (userId: string, changes: { role?: AdminRole; active?: boolean }) => Promise<void>; deleteUser: (userId: string) => Promise<void> }) {
  const { confirm } = useAdminWorkspace();
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("admin");
  const [busy, setBusy] = useState("");
  const [localError, setLocalError] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setLocalError(""); setBusy("create"); try { await createUser({ email: newEmail.trim(), username: newUsername.trim(), password: newPassword, role: newRole }); setNewEmail(""); setNewUsername(""); setNewPassword(""); setNewRole("admin"); } catch (submitError) { setLocalError(submitError instanceof Error ? submitError.message : "Could not create admin user."); } finally { setBusy(""); } };
  const change = async (user: AdminUser, changes: { role?: AdminRole; active?: boolean }) => { setLocalError(""); setBusy(user.user_id); try { await updateUser(user.user_id, changes); } catch (changeError) { setLocalError(changeError instanceof Error ? changeError.message : "Could not update user."); } finally { setBusy(""); } };
  const remove = async (user: AdminUser) => { if (!await confirm(`Remove ${user.email} permanently?`)) return; setLocalError(""); setBusy(user.user_id); try { await deleteUser(user.user_id); } catch (removeError) { setLocalError(removeError instanceof Error ? removeError.message : "Could not remove user."); } finally { setBusy(""); } };
  const { visible, pagination } = useAdminPagination(users);
  return <>
    <PageHeader eyebrow="Admin users" title="Manage team access" description="Only super admins can create accounts, change roles, deactivate, or remove admin users." />
    {localError && <div className="admin-notice is-error" role="alert">{localError}</div>}
    <form onSubmit={submit} className="admin-card mb-6 bg-[var(--admin-surface)] p-5"><div className="mb-4"><h2 className="text-lg font-semibold">Create admin account</h2><p className="mt-1 text-sm text-[var(--admin-muted)]">The account is confirmed immediately. No invitation or confirmation email is sent; sign-in uses the email address.</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Username<input className="admin-field mt-1" type="text" autoComplete="off" minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" required value={newUsername} onChange={(event) => setNewUsername(event.target.value)} placeholder="team.member" /><span className="mt-1 block text-xs text-[var(--admin-muted)]">3–32 letters, numbers, dots, hyphens, or underscores.</span></label><label className="block text-sm font-medium">Email<input className="admin-field mt-1" type="email" autoComplete="off" maxLength={255} required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="team@example.com" /></label><AdminPasswordField label="Password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" /><label className="block text-sm font-medium">Role<select className="admin-field mt-1" value={newRole} onChange={(event) => setNewRole(event.target.value as AdminRole)}><option value="admin">Admin</option><option value="editor">Editor</option><option value="super_admin">Super admin</option></select></label></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-border)] pt-4"><p className="max-w-lg text-xs leading-relaxed text-[var(--admin-muted)]">Share the password securely with the new user. It won’t be shown again here.</p><button className="admin-button admin-button-primary min-h-11" disabled={busy === "create"}>{busy === "create" ? "Creating…" : "Create user"}</button></div></form>
    <div className="admin-card admin-table-shell overflow-x-auto bg-[var(--admin-surface)]"><table className="admin-responsive-table w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-[var(--admin-border)] text-sm text-[var(--admin-muted)]"><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Actions</th></tr></thead><tbody>{visible.map((user) => <tr key={user.user_id} className="border-b border-[var(--admin-border)]"><td data-label="User" className="p-3 font-medium"><span className="block">{user.username || "Username not set"}{user.email === currentUserEmail && <span className="ml-2 rounded-xl bg-[var(--admin-surface-alt)] px-2 py-1 text-xs font-semibold">You</span>}</span><span className="mt-1 block break-all text-xs font-normal text-[var(--admin-muted)]">{user.email}</span></td><td data-label="Role" className="p-3"><select className="admin-field py-2 text-sm" aria-label={`Role for ${user.email}`} value={user.role} disabled={busy === user.user_id} onChange={(event) => void change(user, { role: event.target.value as AdminRole })}><option value="admin">Admin</option><option value="editor">Editor</option><option value="super_admin">Super admin</option></select></td><td data-label="Status" className="p-3"><StatusBadge label={user.active ? "Active" : "Inactive"} tone={user.active ? "success" : "neutral"} /></td><td data-label="Created" className="p-3">{formatDate(user.created_at)}</td><td data-label="Actions" className="p-3"><div className="flex flex-wrap gap-2"><button type="button" className="admin-button min-h-9 px-3 text-sm" disabled={busy === user.user_id} onClick={() => void change(user, { active: !user.active })}>{user.active ? "Deactivate" : "Activate"}</button><button type="button" className="admin-button min-h-9 px-3 text-sm text-[var(--admin-danger-text)]" disabled={busy === user.user_id} onClick={() => void remove(user)}>Remove</button></div></td></tr>)}</tbody></table>{!users.length && <EmptyState icon={UsersRound} title="No admin users found" description="Create a trusted administrator to get started." compact />}</div>
  {pagination}</>;
}
