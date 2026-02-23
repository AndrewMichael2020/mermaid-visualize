'use client';

import { useRouter } from 'next/navigation';
import { diagramExamples } from '@/lib/diagram-examples';
import DiagramPreview from '@/components/diagram-preview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Copy, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/header'; // Reusing header for consistency

export default function GalleryPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleUseTemplate = (code: string) => {
    // Save to session storage to be picked up by the editor
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mermaid-template', code);
    }
    router.push('/');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: "Template code copied to clipboard" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Simplified Header or just a Back button */}
      <div className="border-b p-4 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Diagram Gallery</h1>
      </div>

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Explore Possibilities</h2>
          <p className="text-muted-foreground max-w-2xl">
            Mermaid.js supports a wide variety of diagram types. Browse the collection below, 
            preview them live, and click "Use Template" to start editing or asking AI to customize it for you.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Examples use Mermaid v10+ syntax; if targeting another Mermaid version, verify compatibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {diagramExamples.map((example, index) => (
            <Card key={index} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{example.title}</CardTitle>
                    <div className="text-xs font-medium text-primary mt-1 px-2 py-0.5 bg-primary/10 rounded-full w-fit">
                      {example.category}
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2 line-clamp-2 h-10">
                  {example.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 p-4 pt-0">
                <DiagramPreview code={example.code} />
              </CardContent>

              <CardFooter className="flex gap-2 p-4 pt-0">
                <Button 
                  variant="default" 
                  className="flex-1" 
                  onClick={() => handleUseTemplate(example.code)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleCopyCode(example.code)}
                  title="Copy Code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
