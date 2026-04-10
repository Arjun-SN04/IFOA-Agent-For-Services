/**
 * DashboardLayout — legacy wrapper kept for pages that import it directly.
 * The actual persistent shell (HeaderNav + main) now lives in App.jsx as
 * DashboardShell, which stays mounted across all /dashboard/* navigations.
 *
 * This component now just renders children inside a content wrapper so
 * pages that still import DashboardLayout continue to work unchanged.
 */
export default function DashboardLayout({ children }) {
  return <>{children}</>
}
