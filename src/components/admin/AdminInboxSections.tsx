"use client";

/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */

import { CMS_LIMITS } from "@/src/lib/cmsValidation";
import { Mail,MessageSquare,Search,UsersRound,X } from "lucide-react";
import { useState } from "react";

import { AdminBadge as StatusBadge,useAdminPagination,useAdminWorkspace } from "@/src/components/admin/AdminUI";

import { CharacterField,EmptyState,PageHeader } from "./AdminFields";
import { AdminRole,AdminUser,formatDate,Row } from "./AdminModels";
export { ReviewManager } from "./ReviewEditor";

export function EnquiryManager({ enquiries, updateStatus, updateNotes, convert }: { enquiries: Row[]; updateStatus: (enquiry: Row, status: string) => void; updateNotes: (enquiry: Row, notes: string) => void; convert: (enquiry: Row) => void }) {
  const [query, setQuery] = useState("");
  const filtered = enquiries.filter((item) => `${item.company_name} ${item.contact_name} ${item.email}`.toLowerCase().includes(query.toLowerCase()));
  const { visible, pagination } = useAdminPagination(filtered);
  return <>
    <PageHeader eyebrow="Enquiries" title="Corporate enquiries" description="Respond to companies and project teams with a clear view of each request." />
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-xl"><Search className="admin-search-icon" size={18} aria-hidden="true" /><input className="admin-field admin-search-input" aria-label="Search company, contact, or email" placeholder="Search company, contact, or email" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <p className="text-sm text-[var(--admin-muted)]">{filtered.length} {filtered.length === 1 ? "enquiry" : "enquiries"}</p>
    </div>
    <div className="admin-card admin-table-shell overflow-x-auto bg-[var(--admin-surface)]">
      <table className="admin-responsive-table w-full min-w-[1040px] text-left text-sm">
        <thead><tr className="border-b border-[var(--admin-border)] text-sm text-[var(--admin-muted)]"><th className="p-3">Company</th><th className="p-3">Contact</th><th className="p-3">Dates</th><th className="p-3">Status</th><th className="p-3">Internal notes</th><th className="p-3">Update</th></tr></thead>
        <tbody>{visible.map((enquiry) => <tr key={String(enquiry.id)} className="border-b border-[var(--admin-border)] align-top">
          <td data-label="Company" className="p-3 font-medium">{enquiry.company_name}<br /><span className="text-sm font-normal text-[var(--admin-muted)]">{enquiry.houses_needed || 1} house(s)</span></td>
          <td data-label="Contact" className="p-3">{enquiry.contact_name}<br /><span className="break-all text-sm text-[var(--admin-muted)]">{enquiry.email}</span></td>
          <td data-label="Dates" className="p-3">{formatDate(enquiry.arrival)} – {formatDate(enquiry.departure)}</td>
          <td data-label="Status" className="p-3"><StatusBadge domain="enquiry" value={enquiry.status || "new"} /></td>
          <td data-label="Internal notes" className="p-3"><textarea aria-label={`Internal notes for ${enquiry.company_name}`} className="admin-field min-h-20 min-w-52 text-sm" defaultValue={String(enquiry.internal_notes || "")} maxLength={CMS_LIMITS.admin_notes} placeholder="Add an internal note" onBlur={(event) => { if (event.target.value !== String(enquiry.internal_notes || "")) updateNotes(enquiry, event.target.value); }} /></td>
          <td data-label="Update" className="p-3"><div className="flex min-w-44 flex-col gap-2"><select className="admin-field py-2 text-sm" aria-label={`Status for ${enquiry.company_name}`} value={String(enquiry.status || "new")} onChange={(event) => updateStatus(enquiry, event.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="pending_approval">Pending approval</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="converted">Converted</option></select>{enquiry.status === "approved" && <button type="button" className="admin-button admin-button-primary min-h-9 px-3 text-sm" onClick={() => convert(enquiry)}>Convert to bookings</button>}</div></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <EmptyState icon={MessageSquare} title="No enquiries found" description="New corporate enquiries will appear here." compact />}
    </div>
  {pagination}</>;
}

export function ContactManager({ contacts, unavailable, updateStatus, updateNotes }: { contacts: Row[]; unavailable: boolean; updateStatus: (contact: Row, status: string) => void; updateNotes: (contact: Row, notes: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = contacts.filter((item) => `${item.first_name} ${item.last_name} ${item.email} ${item.phone} ${item.message}`.toLowerCase().includes(query.toLowerCase()));

  const { visible, pagination } = useAdminPagination(filtered);
  return <>
    <PageHeader eyebrow="Contacts" title="Customer contact messages" description="Messages sent from the public Contact page. Corporate stay requests remain in the separate Enquiries workspace." />
    {unavailable && <div className="admin-notice is-error mb-4" role="alert"><X size={18} />Contact messages could not be loaded. Refresh to retry.</div>}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-xl"><Search className="admin-search-icon" size={18} aria-hidden="true" /><input className="admin-field admin-search-input" aria-label="Search name, email, phone, or message" placeholder="Search name, email, phone, or message" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <p className="text-sm text-[var(--admin-muted)]">{filtered.length} {filtered.length === 1 ? "message" : "messages"}</p>
    </div>
    <div className="admin-card admin-table-shell overflow-x-auto bg-[var(--admin-surface)]">
      <table className="admin-responsive-table w-full min-w-[1180px] text-left text-sm">
        <thead><tr className="border-b border-[var(--admin-border)] text-sm text-[var(--admin-muted)]"><th className="p-3">Customer</th><th className="p-3">Message</th><th className="p-3">Request</th><th className="p-3">Received</th><th className="p-3">Status</th><th className="p-3">Internal notes</th><th className="p-3">Update</th></tr></thead>
        <tbody>{visible.map((contact) => <tr key={String(contact.id)} className="border-b border-[var(--admin-border)] align-top">
          <td data-label="Customer" className="p-3"><p className="font-medium">{contact.first_name} {contact.last_name}</p><a className="mt-1 block break-all text-sm text-[var(--admin-text)] hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a>{contact.phone && <a className="mt-1 block text-sm text-[var(--admin-muted)] hover:underline" href={`tel:${contact.phone}`}>{contact.phone}</a>}</td>
          <td data-label="Message" className="max-w-sm p-3"><p className="whitespace-pre-line break-words text-sm leading-relaxed text-[var(--admin-text)]">{contact.message}</p></td>
          <td data-label="Request" className="p-3 text-[var(--admin-muted)]"><p>{contact.project_type || "Not specified"}</p><p className="mt-1 text-sm">{contact.preferred_house || "House not specified"}</p></td>
          <td data-label="Received" className="whitespace-nowrap p-3 text-[var(--admin-muted)]">{formatDate(contact.created_at)}</td>
          <td data-label="Status" className="p-3"><StatusBadge domain="enquiry" value={contact.status || "new"} /></td>
          <td data-label="Internal notes" className="p-3"><textarea aria-label={`Internal notes for ${contact.first_name} ${contact.last_name}`} className="admin-field min-h-20 min-w-52 text-sm" defaultValue={String(contact.internal_notes || "")} maxLength={CMS_LIMITS.admin_notes} placeholder="Add an internal note" onBlur={(event) => { if (event.target.value !== String(contact.internal_notes || "")) updateNotes(contact, event.target.value); }} /></td>
          <td data-label="Update" className="p-3"><select className="admin-field min-w-36 py-2 text-sm" aria-label={`Status for ${contact.first_name}`} value={String(contact.status || "new")} onChange={(event) => updateStatus(contact, event.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option><option value="spam">Spam</option></select></td>
        </tr>)}</tbody>
      </table>
      {!unavailable && !filtered.length && <EmptyState icon={Mail} title={query ? "No messages found" : "No customer messages"} description={query ? "Try a different name, email address, or phrase." : "Messages sent from the public Contact page will appear here."} compact />}
    </div>
  {pagination}</>;
}

export function AdminUserManager({ users, currentUserEmail, createUser, updateUser, deleteUser }: { users: AdminUser[]; currentUserEmail: string; createUser: (email: string, role: AdminRole) => Promise<void>; updateUser: (userId: string, changes: { role?: AdminRole; active?: boolean }) => Promise<void>; deleteUser: (userId: string) => Promise<void> }) {
  const { confirm } = useAdminWorkspace();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("admin");
  const [busy, setBusy] = useState("");
  const [localError, setLocalError] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setLocalError(""); setBusy("invite"); try { await createUser(inviteEmail.trim(), inviteRole); setInviteEmail(""); } catch (submitError) { setLocalError(submitError instanceof Error ? submitError.message : "Could not invite admin user."); } finally { setBusy(""); } };
  const change = async (user: AdminUser, changes: { role?: AdminRole; active?: boolean }) => { setLocalError(""); setBusy(user.user_id); try { await updateUser(user.user_id, changes); } catch (changeError) { setLocalError(changeError instanceof Error ? changeError.message : "Could not update user."); } finally { setBusy(""); } };
  const remove = async (user: AdminUser) => { if (!await confirm(`Remove ${user.email} permanently?`)) return; setLocalError(""); setBusy(user.user_id); try { await deleteUser(user.user_id); } catch (removeError) { setLocalError(removeError instanceof Error ? removeError.message : "Could not remove user."); } finally { setBusy(""); } };
  const { visible, pagination } = useAdminPagination(users);
  return <>
    <PageHeader eyebrow="Admin users" title="Manage team access" description="Only super admins can invite, change roles, deactivate, or remove admin users." />
    {localError && <div className="admin-notice is-error" role="alert">{localError}</div>}
    <form onSubmit={submit} className="admin-card mb-6 grid gap-4 bg-[var(--admin-surface)] p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end"><CharacterField label="Invite by email" value={inviteEmail} onChange={setInviteEmail} limit={CMS_LIMITS.email_address} type="email" placeholder="team@example.com" /><label className="block text-sm font-medium">Role<select className="admin-field mt-1" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as AdminRole)}><option value="admin">Admin</option><option value="editor">Editor</option><option value="super_admin">Super admin</option></select></label><button className="admin-button admin-button-primary min-h-11" disabled={busy === "invite"}>{busy === "invite" ? "Inviting…" : "Send invitation"}</button></form>
    <div className="admin-card admin-table-shell overflow-x-auto bg-[var(--admin-surface)]"><table className="admin-responsive-table w-full min-w-[780px] text-left text-sm"><thead><tr className="border-b border-[var(--admin-border)] text-sm text-[var(--admin-muted)]"><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Actions</th></tr></thead><tbody>{visible.map((user) => <tr key={user.user_id} className="border-b border-[var(--admin-border)]"><td data-label="Email" className="break-all p-3 font-medium">{user.email}{user.email === currentUserEmail && <span className="ml-2 rounded-xl bg-[var(--admin-surface-alt)] px-2 py-1 text-sm font-semibold">You</span>}</td><td data-label="Role" className="p-3"><select className="admin-field py-2 text-sm" aria-label={`Role for ${user.email}`} value={user.role} disabled={busy === user.user_id} onChange={(event) => void change(user, { role: event.target.value as AdminRole })}><option value="admin">Admin</option><option value="editor">Editor</option><option value="super_admin">Super admin</option></select></td><td data-label="Status" className="p-3"><StatusBadge label={user.active ? "Active" : "Inactive"} tone={user.active ? "success" : "neutral"} /></td><td data-label="Created" className="p-3">{formatDate(user.created_at)}</td><td data-label="Actions" className="p-3"><div className="flex flex-wrap gap-2"><button type="button" className="admin-button min-h-9 px-3 text-sm" disabled={busy === user.user_id} onClick={() => void change(user, { active: !user.active })}>{user.active ? "Deactivate" : "Activate"}</button><button type="button" className="admin-button min-h-9 px-3 text-sm text-[var(--admin-danger-text)]" disabled={busy === user.user_id} onClick={() => void remove(user)}>Remove</button></div></td></tr>)}</tbody></table>{!users.length && <EmptyState icon={UsersRound} title="No admin users found" description="Invite a trusted administrator to get started." compact />}</div>
  {pagination}</>;
}

