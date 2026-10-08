"use client";

import { useEffect, useState } from "react";

type Partner = {
  id: string; partner_id: string; company_name: string; contact_name: string; email: string; phone: string;
  abn: string; purchase_order: string; invoice_requested: boolean; active: boolean;
};
type Draft = { companyName: string; contactName: string; email: string; phone: string; abn: string; purchaseOrder: string; invoiceRequested: boolean; active: boolean };
const empty: Draft = { companyName: "", contactName: "", email: "", phone: "", abn: "", purchaseOrder: "", invoiceRequested: false, active: true };

export function AdminCorporatePartners({ canEdit }: { canEdit: boolean }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/corporate-partners", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load partners.");
    setPartners(result.partners ?? []);
  };
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/corporate-partners", { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not load partners."); return result; })
      .then((result) => setPartners(result.partners ?? []))
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, []);

  const edit = (partner: Partner) => {
    setEditingId(partner.id);
    setDraft({ companyName: partner.company_name, contactName: partner.contact_name, email: partner.email, phone: partner.phone, abn: partner.abn, purchaseOrder: partner.purchase_order, invoiceRequested: partner.invoice_requested, active: partner.active });
    setError(""); setMessage("");
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(editingId ? `/api/admin/corporate-partners/${editingId}` : "/api/admin/corporate-partners", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save partner.");
      await load();
      setMessage(editingId ? "Partner updated." : `Partner created. Share ID ${result.partner.partner_id} securely with your client.`);
      setEditingId(""); setDraft(empty);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save partner."); }
    finally { setBusy(false); }
  };
  const field = (label: string, key: keyof Draft, type = "text", required = false) => <label className="block text-sm font-medium text-[var(--admin-text)]">{label}<input className="admin-field mt-1 w-full" type={type} required={required} value={String(draft[key])} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>;

  return <div className="space-y-6">
    <div><p className="admin-section-kicker">Corporate accounts</p><h2 className="mt-2">Partner IDs</h2><p className="mt-2 max-w-2xl text-sm text-[var(--admin-muted)]">Create a partner once. Their company, contact and billing details are then used automatically whenever they book with their ID. Treat IDs like private booking credentials.</p></div>
    {error && <div className="admin-notice is-error" role="alert">{error}</div>}
    {message && <div className="admin-notice" role="status">{message}</div>}
    {canEdit && <form onSubmit={save} className="admin-card space-y-5 p-5 sm:p-7">
      <div className="flex items-center justify-between gap-4"><h3 className="text-xl font-semibold">{editingId ? "Edit partner" : "New partner"}</h3>{editingId && <button type="button" className="admin-button" onClick={() => { setEditingId(""); setDraft(empty); }}>Cancel edit</button>}</div>
      <div className="grid gap-4 sm:grid-cols-2">{field("Company name", "companyName", "text", true)}{field("Contact name", "contactName", "text", true)}{field("Business email", "email", "email", true)}{field("Phone", "phone", "tel", true)}{field("ABN (optional)", "abn")}{field("Purchase order / cost centre (optional)", "purchaseOrder")}</div>
      <div className="flex flex-wrap gap-6"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.invoiceRequested} onChange={(event) => setDraft({ ...draft, invoiceRequested: event.target.checked })} /> GST invoice requested</label>{editingId && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Active ID</label>}</div>
      <button type="submit" disabled={busy} className="admin-button admin-button-primary">{busy ? "Saving…" : editingId ? "Save partner" : "Create Partner ID"}</button>
    </form>}
    <div className="admin-card overflow-x-auto"><table className="w-full min-w-[740px] text-left text-sm"><thead><tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]"><th className="p-4">Company</th><th className="p-4">Partner ID</th><th className="p-4">Contact</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{partners.map((partner) => <tr key={partner.id} className="border-b border-[var(--admin-border)] last:border-0"><td className="p-4 font-semibold">{partner.company_name}</td><td className="p-4 font-mono">{partner.partner_id}</td><td className="p-4">{partner.contact_name}<br /><span className="text-[var(--admin-muted)]">{partner.email}</span></td><td className="p-4">{partner.active ? "Active" : "Inactive"}</td><td className="p-4">{canEdit && <button type="button" className="admin-button" onClick={() => edit(partner)}>Edit</button>}</td></tr>)}</tbody></table>{!partners.length && <p className="p-6 text-sm text-[var(--admin-muted)]">No partners yet. Create one above to issue their ID.</p>}</div>
  </div>;
}
