"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Share2, WrenchIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme as useNextTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { initializeMermaid, getLastParseError, clearLastParseError } from "@/lib/mermaid-config";
import { buildDetailedErrorMessage } from "@/lib/mermaid-validator";
import { useSessionCost } from "@/contexts/session-cost-context";

interface DiagramViewerProps {
  code: string;
  theme: string;
  setTheme: (theme: string) => void;
  /**
   * Called whenever the AI-fix state changes so parent components can consume
   * error context (e.g. to inject it into the Enhance prompt).
   *
   * - Both arguments are `null` when the diagram renders successfully.
   * - `errorMessage` is the detailed render/parse error when AI fix failed.
   * - `aiAttemptExplanation` is what the fix agent tried (may be empty string).
   */
  onFixStateChange?: (errorMessage: string | null, aiAttemptExplanation: string | null) => void;
  /** Called with the AI-corrected code so the editor can reflect the fix. */
  onCodeFix?: (fixedCode: string) => void;
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

export default function DiagramViewer({ code, theme: selectedTheme, setTheme, onFixStateChange, onCodeFix }: DiagramViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  type FixState =
    | { status: 'idle' }
    | { status: 'fixing' }
    | { status: 'fixed'; explanation: string; originalError: string }
    | { status: 'failed'; fixedCode: string; explanation: string; originalError: string };

  const [fixState, setFixState] = useState<FixState>({ status: 'idle' });

  // Keep a ref to the latest callback so the async renderDiagram closure always
  // calls the current version without needing it in the effect dependency array.
  const onFixStateChangeRef = useRef(onFixStateChange);
  onFixStateChangeRef.current = onFixStateChange;
  const onCodeFixRef = useRef(onCodeFix);
  onCodeFixRef.current = onCodeFix;

  const { toast } = useToast();
  const { resolvedTheme } = useNextTheme();
  const { recordUsage } = useSessionCost();

  const isDark = selectedTheme === 'dark';

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const mermaid = await initializeMermaid({
          theme: isDark ? 'dark' : 'default',
          themeVariables: isDark ? darkThemeVariables : undefined,
        });

        if (viewerRef.current && code) {
          try {
            clearLastParseError();
            const isValid = await mermaid.parse(code, { suppressErrors: true });

            if (isValid === false) {
              // mermaid.parse() returned false — build a detailed error using
              // both the captured parse error and a structural analysis of the code.
              const rawParseError = getLastParseError();
              const errorMsg = buildDetailedErrorMessage(code, rawParseError);
              console.error('[DiagramViewer] Parse failed. Detailed error:\n', errorMsg);
              await attemptAiFix(mermaid, code, errorMsg);
              return;
            }

            const { svg } = await mermaid.render("mermaid-svg-" + Date.now(), code);
            if (viewerRef.current) viewerRef.current.innerHTML = svg;
            setError(null);
            setFixState({ status: 'idle' });
            onFixStateChangeRef.current?.(null, null);
          } catch (e: unknown) {
            const rawErrorMsg = e instanceof Error ? e.message : String(e);
            // Enrich the raw render/parse error with structural analysis
            const errorMsg = buildDetailedErrorMessage(code, rawErrorMsg);
            console.error("Mermaid rendering error:", e, '\nDetailed error:\n', errorMsg);
            await attemptAiFix(mermaid, code, errorMsg);
          }
        } else if (viewerRef.current) {
          viewerRef.current.innerHTML = '';
          setError(null);
          setFixState({ status: 'idle' });
        }
      } catch (e) {
        console.error(e);
        setError("An unexpected error occurred while rendering the diagram.");
        setFixState({ status: 'idle' });
        if (viewerRef.current) viewerRef.current.innerHTML = '';
      }
    };

    /** One-shot AI fix attempt. Never called recursively. */
    const attemptAiFix = async (
      mermaid: Awaited<ReturnType<typeof initializeMermaid>>,
      brokenCode: string,
      errorMsg: string,
    ) => {
      if (viewerRef.current) viewerRef.current.innerHTML = '';
      setError(null);
      setFixState({ status: 'fixing' });

      let fixedCode = '';
      let explanation = 'AI could not determine the cause.';

      try {
        const res = await fetch('/api/fix-diagram-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diagramCode: brokenCode, errorMessage: errorMsg }),
        });
        if (res.ok) {
          const data = await res.json();
          fixedCode = data.fixedCode ?? '';
          explanation = data.explanation ?? explanation;
          if (data.usage) recordUsage(data.usage);
        }
      } catch (fetchErr) {
        console.error('fix-diagram-error fetch failed:', fetchErr);
      }

      if (!fixedCode) {
        setFixState({ status: 'failed', fixedCode: brokenCode, explanation, originalError: errorMsg });
        onFixStateChangeRef.current?.(errorMsg, explanation);
        return;
      }

      // One attempt to render the AI fix — no further recursion
      try {
        clearLastParseError();
        const isValid = await mermaid.parse(fixedCode, { suppressErrors: true });
        if (isValid === false) {
          const detailedFixError = buildDetailedErrorMessage(fixedCode, getLastParseError());
          console.error('[DiagramViewer] AI-fixed code still invalid:\n', detailedFixError);
          throw new Error(detailedFixError);
        }

        const { svg } = await mermaid.render("mermaid-fix-svg-" + Date.now(), fixedCode);
        if (viewerRef.current) viewerRef.current.innerHTML = svg;
        setFixState({ status: 'fixed', explanation, originalError: errorMsg });
        onFixStateChangeRef.current?.(null, null);
        onCodeFixRef.current?.(fixedCode);
      } catch {
        setFixState({ status: 'failed', fixedCode, explanation, originalError: errorMsg });
        onFixStateChangeRef.current?.(errorMsg, explanation);
      }
    };

    renderDiagram();
  }, [code, selectedTheme, isDark]);

  // Auto-dismiss the "Auto-corrected" banner after 10 seconds
  useEffect(() => {
    if (fixState.status !== 'fixed') return;
    const timer = setTimeout(() => setFixState({ status: 'idle' }), 10000);
    return () => clearTimeout(timer);
  }, [fixState.status]);
  
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

        {/* Spinner while AI fix is in progress */}
        {fixState.status === 'fixing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">AI is attempting to fix the diagram…</p>
          </div>
        )}

        {/* Success banner when AI fixed it */}
        {fixState.status === 'fixed' && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs text-green-700 dark:text-green-400 shadow-sm max-w-xs">
            <WrenchIcon className="h-3.5 w-3.5 shrink-0" />
            <span><strong>Auto-corrected:</strong> {fixState.explanation}</span>
          </div>
        )}

        {/* Rich error panel when AI fix also failed */}
        {fixState.status === 'failed' && (
          <div className="absolute inset-0 flex flex-col gap-3 overflow-auto bg-destructive/5 p-5 text-sm">
            <div className="flex items-center gap-2 font-bold text-destructive">
              <WrenchIcon className="h-4 w-4 shrink-0" />
              Diagram Error — AI fix unsuccessful
            </div>

            <div>
              <p className="mb-1 font-semibold text-destructive/80">Original error:</p>
              <pre className="rounded-md bg-destructive/10 p-2 text-xs whitespace-pre-wrap text-destructive">{fixState.originalError}</pre>
            </div>

            <div className="rounded-md border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-amber-800 dark:text-amber-300">
              <p className="font-semibold">What AI tried:</p>
              <p className="mt-0.5 text-xs">{fixState.explanation}</p>
            </div>

            <div>
              <p className="mb-1 font-semibold text-muted-foreground">AI&apos;s attempted code (also invalid):</p>
              <pre className="rounded-md bg-muted p-2 text-xs whitespace-pre-wrap text-muted-foreground max-h-48 overflow-auto">{fixState.fixedCode}</pre>
            </div>

            <p className="text-xs text-muted-foreground">
              Edit the code in the editor to correct the syntax manually.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
