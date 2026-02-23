"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme as useNextTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { initializeMermaid } from "@/lib/mermaid-config";

interface DiagramViewerProps {
  code: string;
  theme: string;
  setTheme: (theme: string) => void;
}

const darkThemeVariables = {
    background: '#333',
    primaryColor: '#333',
    primaryTextColor: '#fff',
    lineColor: '#888888',
    textColor: '#f0f0f0',
    nodeBorder: '#888888',
    mainBkg: '#333333',
    nodeTextColor: '#fff',
};

export default function DiagramViewer({ code, theme: selectedTheme, setTheme }: DiagramViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { resolvedTheme } = useNextTheme();

  const isDark = selectedTheme === 'dark';

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        // Use centralized mermaid configuration with error suppression
        const mermaid = await initializeMermaid({
          theme: isDark ? 'dark' : 'default',
          themeVariables: isDark ? darkThemeVariables : undefined,
        });

        if (viewerRef.current && code) {
          try {
            // Validate code before rendering to prevent bomb widget from appearing
            const isValid = await mermaid.parse(code, { suppressErrors: true });
            if (isValid === false) {
              setError("Invalid Mermaid syntax. Please check your code.");
              if (viewerRef.current) {
                viewerRef.current.innerHTML = '';
              }
              return;
            }
            
            const { svg } = await mermaid.render(
              "mermaid-svg-" + Date.now(),
              code // Preserve classDef/class styling
            );
            
            if (viewerRef.current) {
              viewerRef.current.innerHTML = svg;
            }
            setError(null);
          } catch(e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.error("Mermaid rendering error:", e);
            setError(errorMessage || "Invalid Mermaid syntax. Please check your code.");
            if (viewerRef.current) {
              viewerRef.current.innerHTML = '';
            }
          }
        } else if (viewerRef.current) {
          viewerRef.current.innerHTML = '';
          setError(null);
        }
      } catch (e) {
        console.error(e);
        setError("An unexpected error occurred while rendering the diagram.");
        if (viewerRef.current) {
            viewerRef.current.innerHTML = '';
        }
      }
    };

    renderDiagram();
  }, [code, selectedTheme, isDark]);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Copied to clipboard!', description: 'Mermaid code has been copied.' });
    } catch (err) {
      // Fallback for when navigator.clipboard is not available
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";  // Avoid scrolling to bottom
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        toast({ title: 'Copied to clipboard!', description: 'Mermaid code has been copied.' });
      } catch (copyErr) {
        console.error('Fallback copy failed', copyErr);
        toast({ title: 'Copy failed', description: 'Could not copy code to clipboard.', variant: 'destructive' });
      }
      document.body.removeChild(textArea);
    }
  }

  const handleDownload = async () => {
    if (!viewerRef.current?.firstElementChild || error) {
      toast({ title: 'Download failed', description: error ? 'Cannot download a diagram with errors.' : 'There is no diagram to download.', variant: 'destructive'});
      return;
    }

    try {
        // Use centralized mermaid configuration with error suppression
        const mermaid = await initializeMermaid({
          theme: isDark ? 'dark' : 'default',
          themeVariables: isDark ? darkThemeVariables : undefined,
        });

        let { svg } = await mermaid.render("mermaid-download-svg-" + Date.now(), code);
        
        // Sanitize <br> tags to be XML-compliant
        svg = svg.replace(/<br>/g, '<br/>');

        // Add Padding by adjusting viewBox
        const padding = 20;
        svg = svg.replace(/viewBox="([^"]*)"/, (match, viewBox) => {
            const parts = viewBox.split(' ').map(Number);
            if (parts.length === 4) {
                const [x, y, w, h] = parts;
                const newX = x - padding;
                const newY = y - padding;
                const newW = w + (padding * 2);
                const newH = h + (padding * 2);
                return `viewBox="${newX} ${newY} ${newW} ${newH}"`;
            }
            return match;
        });

        if (isDark) {
          // Inject a dark background rectangle into the SVG
          const darkBgRect = `<rect x="-50%" y="-50%" width="200%" height="200%" fill="#1a1a1a"></rect>`;
          const svgTagEnd = svg.indexOf('>') + 1;
          svg = svg.slice(0, svgTagEnd) + darkBgRect + svg.slice(svgTagEnd);
        } else {
           // For light theme, optionally add a white background for consistent viewing
           const whiteBgRect = `<rect x="-50%" y="-50%" width="200%" height="200%" fill="#ffffff"></rect>`;
           const svgTagEnd = svg.indexOf('>') + 1;
           svg = svg.slice(0, svgTagEnd) + whiteBgRect + svg.slice(svgTagEnd);
        }

        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = 'diagram.svg';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(svgUrl);
        toast({ title: 'Downloading diagram.svg' });

    } catch (e) {
        console.error("Failed to render diagram for download", e);
        toast({ title: 'Download failed', description: 'Could not render diagram for download.', variant: 'destructive'});
    }
  }

  return (
    <Card className="flex-1 flex flex-col h-full shadow-lg">
      <CardHeader className="flex-row items-center justify-between border-b p-4">
        <CardTitle className="text-lg font-headline">Visualization</CardTitle>
        <div className="flex items-center gap-2">
            <Label htmlFor="theme-select" className="text-sm font-normal sr-only sm:not-sr-only">Theme</Label>
            <Select value={selectedTheme} onValueChange={setTheme}>
                <SelectTrigger id="theme-select" className="w-[120px]">
                    <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy Mermaid Code">
                <Share2 className="h-4 w-4"/>
                <span className="sr-only">Copy Code</span>
            </Button>
            <Button variant="outline" size="icon" onClick={handleDownload} aria-label="Download Diagram as SVG">
                <Download className="h-4 w-4"/>
                <span className="sr-only">Download SVG</span>
            </Button>
        </div>
      </CardHeader>
      <CardContent className={cn("flex-1 p-4 overflow-auto relative flex items-center justify-center transition-colors", isDark ? 'bg-[#1a1a1a]' : 'bg-muted/30')}>
        <div ref={viewerRef} className="w-full h-full [&>svg]:max-w-full [&>svg]:h-auto" />
        {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 p-4 text-center">
                <p className="font-bold text-destructive">Diagram Error</p>
                <pre className="mt-2 text-xs text-destructive bg-destructive/20 p-2 rounded-md whitespace-pre-wrap w-full max-w-md">{error}</pre>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
