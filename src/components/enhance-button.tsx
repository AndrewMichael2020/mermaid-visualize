'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';

interface EnhanceButtonProps {
  currentCode: string;
  onEnhancedCode: (code: string) => void;
}

export default function EnhanceButton({ currentCode, onEnhancedCode }: EnhanceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEnhance = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mermaidCode: currentCode, prompt }),
      });
      const { mermaidCode } = await response.json();
      onEnhancedCode(mermaidCode);
      setIsOpen(false);
    } catch (error) {
      console.error('Error enhancing diagram:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="mr-2 h-4 w-4" />
          Enhance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enhance Diagram with a Prompt</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="e.g., Add a new step after the 'OK' node."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
          />
          <Button onClick={handleEnhance} disabled={isLoading}>
            {isLoading ? 'Enhancing...' : 'Enhance'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
