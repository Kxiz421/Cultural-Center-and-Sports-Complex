import { redirect } from "next/navigation";

/**
 * The client dashboard is hidden: a client signs in straight onto the facility
 * calendar (`PANEL_HOME` in `lib/auth-roles.js`) and the dashboard is not in
 * their sidebar, so a direct visit is forwarded there too.
 */
export default function ClientDashboardPage() {
  redirect("/panel/client/calendar");
}
