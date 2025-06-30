"use client";

import * as React from "react";
// import { GalleryVerticalEnd } from "lucide-react";

// import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { MainLogo } from "./main-logo";
import Link from "next/link";
import { Separator } from "./ui/separator";
import { HandCoins, Home, Receipt, Users2, Wallet2 } from "lucide-react";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },
    {
      title: "Clientes",
      url: "/dashboard/clientes",
      icon: Users2,
    },
    {
      title: "Prestamos",
      url: "/dashboard/prestamos",
      icon: HandCoins,
    },
    {
      title: "Cuentas",
      url: "/dashboard/cuentas",
      icon: Wallet2,
    },
    {
      title: "Gastos",
      url: "/dashboard/gastos",
      icon: Receipt,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="w-full flex flex-col items-center gap-0.5 leading-none">
                  <MainLogo />
                  {/* <span className="">v1.0.0</span> */}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={item.url} className="font-bold text-primary">
                    {item.icon && (
                      <item.icon className="w-8 h-8 text-primary" />
                    )}{" "}
                    {item.title}
                  </Link>
                </SidebarMenuButton>
                {/* {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((item) => (
                      <SidebarMenuSubItem
                        key={item.title}
                        className="text-base"
                      >
                        <SidebarMenuSubButton
                          asChild
                          isActive={item.url === path}
                        >
                          <Link href={item.url}>{item.title}</Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null} */}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
