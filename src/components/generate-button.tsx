'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Wand2 } from 'lucide-react';

interface GenerateButtonProps {
  onGeneratedCode: (code: string) => void;
}

export default function GenerateButton({ onGeneratedCode }: GenerateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const { mermaidCode } = await response.json();
      onGeneratedCode(mermaidCode);
      setIsOpen(false);
    } catch (error) {
      console.error('Error generating diagram:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 className="mr-2 h-4 w-4" />
          Generate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Diagram from Prompt</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="e.g., A simple flowchart with a start, a decision, and two end nodes."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={25}
          />
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
