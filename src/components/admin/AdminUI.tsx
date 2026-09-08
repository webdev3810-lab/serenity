"use client";
import { statusPresentation, type BadgeTone, type StatusDomain } from "@/src/lib/admin-status";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";

export function AdminBadge({ value, domain = "content", label, tone }: { value?: unknown; domain?: StatusDomain; label?: string; tone?: BadgeTone }) {
  const status = statusPresentation(domain, value ?? label);
  return <span className="admin-badge" data-tone={tone ?? status.tone}>{label ?? status.label}</span>;
}
let modalCount = 0;
let originalOverflow = "";
/** Native modal dialogs provide inert background, focus containment and Escape. */
export function AdminDialog({ children, label, onClose, drawer = false, busy = false, className = "" }: { children: React.ReactNode; label: string; onClose: () => void; drawer?: boolean; busy?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    if (modalCount++ === 0) originalOverflow = document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow = "hidden";
    return () => { dialog?.close(); if (--modalCount === 0) document.body.style.overflow = originalOverflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={ref} className={`admin-dialog ${drawer ? "admin-drawer" : ""} ${className}`} aria-label={label} aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onClick={(event) => { if (event.target === event.currentTarget && !busy) { const b = event.currentTarget.getBoundingClientRect(); if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) onClose(); } }}>{children}</dialog>;
}
type ConfirmOptions = { title: string; description: string; confirmLabel?: string; destructive?: boolean };
type WorkspaceContext = { confirm: (options: ConfirmOptions | string) => Promise<boolean>; navigate: (action: () => void) => Promise<void>; register: (id: string, dirty: boolean) => void };
const Workspace = createContext<WorkspaceContext | null>(null);
export function AdminWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const dirty = useRef(new Set<string>());
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const confirm = useCallback((options: ConfirmOptions | string) => new Promise<boolean>((resolve) => {
    resolver.current?.(false); resolver.current = resolve;
    setPending(typeof options === "string" ? { title: "Confirm action", description: options, destructive: true } : options);
  }), []);
  const finish = (value: boolean) => { resolver.current?.(value); resolver.current = null; setPending(null); };
  const register = useCallback((id: string, value: boolean) => { if (value) dirty.current.add(id); else dirty.current.delete(id); }, []);
  const navigate = useCallback(async (action: () => void) => {
    if (!dirty.current.size || await confirm({ title: "Leave unsaved changes?", description: "Your unsaved edits will be lost. Save them before leaving to keep your work.", confirmLabel: "Leave without saving", destructive: true })) action();
  }, [confirm]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current.size) { event.preventDefault(); event.returnValue = ""; } };
    let point = Number(history.state?.adminPoint ?? 1);
    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);
    originalReplace({ ...history.state, adminPoint: point }, "");
    const push: History["pushState"] = (state, unused, url) => { point++; originalPush({ ...state, adminPoint: point }, unused, url); };
    const replace: History["replaceState"] = (state, unused, url) => originalReplace({ ...state, adminPoint: point }, unused, url);
    history.pushState = push; history.replaceState = replace;
    let restoring = false;
    const pop = (event: PopStateEvent) => {
      const next = Number(event.state?.adminPoint ?? 0);
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return; }
      if (dirty.current.size && point !== next && !window.confirm("Leave this page and discard unsaved changes?")) {
        event.stopImmediatePropagation(); restoring = true; history.go(point - next); return;
      }
      point = next;
    };
    const link = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!dirty.current.size || !anchor || anchor.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0 || anchor.href === location.href) return;
      event.preventDefault(); event.stopPropagation(); void navigate(() => { dirty.current.clear(); location.href = anchor.href; });
    };
    window.addEventListener("beforeunload", beforeUnload); window.addEventListener("popstate", pop, true); document.addEventListener("click", link, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("popstate", pop, true); document.removeEventListener("click", link, true); if (history.pushState === push) history.pushState = originalPush; if (history.replaceState === replace) history.replaceState = originalReplace; };
  }, [navigate]);
  return <Workspace.Provider value={{ confirm, navigate, register }}>{children}{pending && <AdminDialog label={pending.title} onClose={() => finish(false)}><div className="admin-confirm"><div className="flex items-start justify-between gap-4"><h2>{pending.title}</h2><button type="button" className="admin-icon-button" aria-label="Cancel" onClick={() => finish(false)}><X size={18} /></button></div><p>{pending.description}</p><div className="admin-dialog-actions"><button type="button" autoFocus className="admin-button" onClick={() => finish(false)}>Keep working</button><button type="button" className={`admin-button ${pending.destructive ? "admin-button-danger" : "admin-button-primary"}`} onClick={() => finish(true)}>{pending.confirmLabel ?? "Confirm"}</button></div></div></AdminDialog>}</Workspace.Provider>;
}
export function useAdminWorkspace() { const value = useContext(Workspace); if (!value) throw new Error("Admin workspace provider missing"); return value; }
export function useDirtyGuard(dirty: boolean) {
  const id = useId(); const { register } = useAdminWorkspace();
  useEffect(() => { register(id, dirty); return () => register(id, false); }, [id, dirty, register]);
}
export function AdminPagination({ page, total, pageSize = 20, onPage }: { page: number; total: number; pageSize?: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <nav className="admin-pagination" aria-label="Results pages"><span role="status">{total ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}` : "0"} of {total}</span><div><button type="button" className="admin-icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={18} /></button><span>Page {page} of {pages}</span><button type="button" className="admin-icon-button" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRight size={18} /></button></div></nav>;
}
export function useAdminPagination<T>(items: T[], pageSize = 20) {
  const [requested, setPage] = useState(1);
  const page = Math.min(requested, Math.max(1, Math.ceil(items.length / pageSize)));
  return { visible: items.slice((page - 1) * pageSize, page * pageSize), pagination: <AdminPagination page={page} total={items.length} pageSize={pageSize} onPage={setPage} />, resetPage: () => setPage(1) };
}
