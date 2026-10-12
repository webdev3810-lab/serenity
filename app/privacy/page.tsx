import { permanentRedirect } from "next/navigation";

export default function Page() {
  permanentRedirect("/guest-information#privacy");
}
