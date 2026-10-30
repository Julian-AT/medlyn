import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { highlightClasses } from "./page-preview-position";

export type PagePreviewBox = { x0: number; y0: number; x1: number; y1: number };
export type PagePreviewProps = {
  src: string;
  page: number;
  width: number;
  height: number;
  boxes?: PagePreviewBox[];
  title?: string;
};

export function PagePreview({
  src,
  page,
  width,
  height,
  boxes = [],
  title = "Source page",
}: PagePreviewProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Badge variant="secondary">Page {page}</Badge>
      </CardHeader>
      <CardContent className="relative mx-3 overflow-hidden rounded-md p-0">
        {/* Page dimensions keep the image and normalised boxes on the same coordinate plane. */}
        <Image
          unoptimized
          src={src}
          alt={`${title}, page ${page}. Highlighted areas mark the cited passage.`}
          width={width}
          height={height}
          className="block h-auto w-full"
        />
        {boxes.map((box) => {
          const position = highlightClasses(box);
          return position ? (
            <CardContent
              key={`${box.x0}:${box.y0}:${box.x1}:${box.y1}`}
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute border-2 border-primary bg-primary/15 p-0",
                position,
              )}
            />
          ) : null;
        })}
      </CardContent>
    </Card>
  );
}
