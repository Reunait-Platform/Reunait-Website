"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ShieldCheck, Flag } from "lucide-react"

const items = [
  { title: "Verifications", href: "/volunteer/verifications", icon: ShieldCheck },
  { title: "Flagged Cases", href: "/volunteer/flagged", icon: Flag },
]

export function AppVolunteerSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar
      variant="inset"
      collapsible="offcanvas"
      className="top-16 sm:top-20"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
            Volunteer
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} className="text-sm font-medium">
                      <Link href={item.href} className="flex items-center gap-2">
                        <item.icon className="h-5 w-5" />
                        <span className="truncate leading-6">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}


