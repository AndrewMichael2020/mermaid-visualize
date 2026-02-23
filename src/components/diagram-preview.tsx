"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { initializeMermaid } from "@/lib/mermaid-config";

interface DiagramPreviewProps {
  code: string;
  className?: string;
}

export default function DiagramPreview({ code, className }: DiagramPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const render = async () => {
      if (!code) return;
      
      // Reset state
      setError(false);
      
      try {
        // Use a separate ID for each preview to avoid conflicts
        const id = `preview-${Math.random().toString(36).substr(2, 9)}`;
        
        // Use centralized mermaid configuration with error suppression
        const mermaid = await initializeMermaid({
          theme: 'base', // Neutral theme for gallery
        });

        // Validate first and avoid render if invalid
        // Preserve classDef/class styling for proper theming
        const isValid = await mermaid.parse(code, { suppressErrors: true });
        if (isValid === false) {
          setError(true);
          return;
        }
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
      } catch (e) {
        console.error("Preview render failed", e);
        setError(true);
      }
    };

    render();
  }, [code]);

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "w-full h-[200px] flex items-center justify-center overflow-hidden bg-muted/10 rounded-md border border-border/50 p-2", 
        className
      )}
    >
      {error ? (
        <div className="text-xs text-muted-foreground text-center p-4">
          Preview unavailable for this diagram type.
        </div>
      ) : svg ? (
        <div 
          dangerouslySetInnerHTML={{ __html: svg }} 
          className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
        />
      ) : (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      )}
    </div>
  );
}
