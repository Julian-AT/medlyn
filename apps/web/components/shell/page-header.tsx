"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { routeTitle } from "./navigation";
export function PageHeader() {
  const pathname = usePathname();
  return (
    <Card className="shrink-0 gap-0 rounded-none border-0 border-b bg-transparent py-0 shadow-none ring-0 print:hidden">
      <CardContent className="flex h-[49px] flex-nowrap items-center gap-3 px-4">
        <SidebarTrigger aria-label="Toggle navigation" className="shrink-0" />
        <Separator
          orientation="vertical"
          className="data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
        />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList className="flex-nowrap gap-2 overflow-hidden whitespace-nowrap text-sm font-medium sm:gap-2">
            <BreadcrumbItem className="hidden shrink-0 sm:inline-flex">
              <BreadcrumbLink asChild>
                <Link href="/patient">Anna Musterfrau</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate font-medium">
                {routeTitle(pathname)}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {pathname !== "/" && !pathname.startsWith("/chat/") && (
          <Button asChild variant="outline" size="sm" className="ml-auto shrink-0">
            <Link href="/">Ask Medlyn</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
