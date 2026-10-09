"use client";

/* The CMS reads flexible Supabase rows, so the boundary is intentionally defensive. */

import { AdminNavItem, AdminRole, Tab } from "./AdminModels";
export function SidebarProfile({ email, role, collapsed }: { email: string; role: AdminRole; collapsed: boolean }) {
  const initial = email.trim().charAt(0).toUpperCase() || "S";
  const roleLabel = role.replace("_", " ");

  return (
    <div
      className="admin-sidebar-profile"
      title={collapsed ? `${email} · ${roleLabel}` : undefined}
    >
      <span className="admin-avatar" aria-hidden="true">{initial}</span>
      <span className="admin-profile-copy">
        <span className="admin-profile-name">Serenity admin</span>
        <span className="admin-profile-email">{email}</span>
        <span className="admin-profile-role">{roleLabel}</span>
      </span>
    </div>
  );
}

export function AdminNavigation({ items, active, collapsed, onSelect }: { items: AdminNavItem[]; active: Tab; collapsed: boolean; onSelect: (id: Tab) => void }) {
  const groups = [
    { label: "Workspace", items: items.filter((item) => item.id === "overview") },
    { label: "Content", items: items.filter((item) => ["homepage", "houses", "reviews", "promotions"].includes(item.id)) },
    { label: "Operations", items: items.filter((item) => ["bookings", "payments", "calendar", "partners", "enquiries", "contacts"].includes(item.id)) },
    { label: "Administration", items: items.filter((item) => ["users", "settings"].includes(item.id)) },
  ];

  return (
    <nav className="admin-nav-list" aria-label="Admin sections">
      {groups.filter((group) => group.items.length > 0).map((group) => (
        <div className="admin-nav-group" key={group.label}>
          <p className="admin-nav-group-label">{group.label}</p>
          <div className="admin-nav-group-items">
            {group.items.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                aria-current={active === id ? "page" : undefined}
                onClick={() => onSelect(id)}
                className={`admin-nav-item ${active === id ? "is-active" : ""}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="admin-nav-copy">
                  <span className="admin-nav-label">{label}</span>
                  <span className="admin-nav-description">{description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
