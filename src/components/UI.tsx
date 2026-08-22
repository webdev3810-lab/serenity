"use client";

import { X } from "lucide-react";

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-[#5A463A]/40 backdrop-blur-xs p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={onClose}>
      <div className="mx-auto max-h-[90vh] w-full max-w-4xl overflow-auto rounded-none bg-white p-6 shadow-2xl border border-stone-200" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <h2 id="modal-title" className="text-xl font-bold text-stone-900">{title}</h2>
          <button className="icon-button" aria-label="Close modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-[#5A463A]/30 md:hidden" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-auto rounded-none bg-white p-6 shadow-2xl border-t border-stone-200" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex justify-center">
          <span className="h-1.5 w-12 rounded-none bg-stone-300" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormInput({
  label,
  id,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; error?: string }) {
  return (
    <label className="block text-sm font-bold text-stone-900" htmlFor={id}>
      {label}
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="field mt-1 text-base font-medium" {...props} />
      {error && <span id={`${id}-error`} className="mt-1 block text-sm font-semibold text-red-700">{error}</span>}
    </label>
  );
}

export function TextArea({ label, id, error, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; id: string; error?: string }) {
  return (
    <label className="block text-sm font-bold text-stone-900" htmlFor={id}>
      {label}
      <textarea id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="field mt-1 min-h-28 text-base font-medium" {...props} />
      {error && <span id={`${id}-error`} className="mt-1 block text-sm font-semibold text-red-700">{error}</span>}
    </label>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return <div role="status" className="fixed bottom-5 right-5 z-[80] rounded-none bg-stone-900 px-4 py-3 text-xs font-bold text-white shadow-2xl border border-stone-700">{message}</div>;
}
