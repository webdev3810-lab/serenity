import { useSyncExternalStore } from "react";
const subscribe = (callback: () => void) => { window.addEventListener("popstate", callback); window.addEventListener("fixture-navigation", callback); return () => { window.removeEventListener("popstate", callback); window.removeEventListener("fixture-navigation", callback); }; };
export function useSearchParams() { return new URLSearchParams(useSyncExternalStore(subscribe, () => location.search, () => "")); }
const change = (url: string, replace = false) => { if (replace) history.replaceState({}, "", url); else history.pushState({}, "", url); window.dispatchEvent(new Event("fixture-navigation")); };
export function useRouter() { return { push: (url: string) => change(url), replace: (url: string) => change(url, true), refresh: () => undefined }; }
