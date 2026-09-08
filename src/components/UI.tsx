"use client";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
let count=0, originalOverflow="";
export function PublicDialog({ label,onClose,children,className="" }: {label:string;onClose:()=>void;children:React.ReactNode;className?:string}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement as HTMLElement|null;if(count++===0)originalOverflow=document.body.style.overflow;dialog?.showModal();document.body.style.overflow="hidden";return()=>{dialog?.close();if(--count===0)document.body.style.overflow=originalOverflow;if(previous?.isConnected)previous.focus();};},[]);
 return <dialog ref={ref} className={"serenity-modal "+className} aria-label={label} onCancel={e=>{e.preventDefault();e.stopPropagation();onClose();}} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}>{children}</dialog>;
}
export function Modal({title,open,onClose,children}:{title:string;open:boolean;onClose:()=>void;children:React.ReactNode}) {return open?<PublicDialog label={title} onClose={onClose}><header className="serenity-modal-heading"><h2>{title}</h2><button type="button" className="serenity-modal-close" aria-label={"Close "+title} onClick={onClose}><X size={20}/></button></header>{children}</PublicDialog>:null;}
export function Drawer({open,onClose,children}:{open:boolean;onClose:()=>void;children:React.ReactNode}) {return open?<PublicDialog label="Your stay" onClose={onClose} className="serenity-booking-drawer"><header className="serenity-modal-heading"><h2>Your stay</h2><button type="button" className="serenity-modal-close" aria-label="Close booking" onClick={onClose}><X size={20}/></button></header>{children}</PublicDialog>:null;}

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
