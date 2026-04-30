/**
 * Root Page — Redirect to dashboard
 *
 * Authenticated users go to /dashboard, unauthenticated go to /login.
 */

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
