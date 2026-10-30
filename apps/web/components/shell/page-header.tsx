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
    <Card className="rounded-none border-b bg-transparent print:hidden py-0 shadow-none ring-0">
      <CardContent className="flex h-16 items-center gap-4 px-6">
        <SidebarTrigger aria-label="Toggle navigation" />
        <Separator orientation="vertical" className="h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/patient">Anna Musterfrau</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{routeTitle(pathname)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {pathname !== "/" && !pathname.startsWith("/chat/") && (
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link href="/">Ask Medlyn</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
