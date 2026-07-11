"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/animate-ui/components/radix/sidebar"
import {
  Home,
  Mail,
  Settings,
  LogOut,
  Plus,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import type { SessionUser } from "@/lib/auth"
import { signOut } from "@/lib/auth-client"
import { ButtonLink } from "@/components/ui/button-link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Seal } from "@/components/ui/icons"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const MAIN_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: Home },
  { label: "Capsules", href: "/dashboard/capsules", icon: Mail },
  { label: "Walls", href: "/dashboard/walls", icon: Users },
]

const ACCOUNT_NAV: NavItem[] = [
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
]

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * animate-ui's `SidebarMenuButton` is built on Radix v1's `asChild` pattern —
 * the child element (here, a Next.js `Link`) is forwarded with the menu
 * button's props and className. This wrapper keeps the JSX readable at the
 * call site.
 */
function NavLink({
  href,
  isActive,
  tooltip,
  children,
}: {
  href: string
  isActive: boolean
  tooltip: string
  children: React.ReactNode
}) {
  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={{ children: tooltip }}
    >
      <Link href={href} prefetch>
        {children}
      </Link>
    </SidebarMenuButton>
  )
}

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    toast.success("Signed out — see you soon.")
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip={{ children: "Seal home" }}
                asChild
              >
                <Link href="/" prefetch>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Seal className="size-5" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Seal</span>
                    <span className="text-xs text-muted-foreground">
                      Time capsule
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {MAIN_NAV.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <NavLink
                      href={item.href}
                      isActive={isActive(pathname, item.href)}
                      tooltip={item.label}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ACCOUNT_NAV.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <NavLink
                      href={item.href}
                      isActive={isActive(pathname, item.href)}
                      tooltip={item.label}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <NavLink
                    href="/capsules/new"
                    isActive={false}
                    tooltip="New capsule"
                  >
                    <Plus className="size-4" />
                    <span>New capsule</span>
                  </NavLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                onClick={handleSignOut}
                tooltip={{
                  children: `${user.name} — ${user.email} (click to sign out)`,
                }}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-7 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
                <LogOut className="ml-auto size-4 text-muted-foreground" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger
            className="-ml-1"
            aria-label="Toggle sidebar"
          />
          <div className="flex-1" />
          <ButtonLink href="/capsules/new" size="sm" className="rounded-full">
            <Plus className="size-4" />
            <span className="hidden sm:inline">New capsule</span>
          </ButtonLink>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
