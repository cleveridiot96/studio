
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, CornerDownLeft, Percent, Divide, Trash2, GripVertical } from 'lucide-react';
import { useDraggable } from "@dnd-kit/core";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const buttonClasses = "text-xl h-14 w-14 rounded-full shadow-md";
const operatorButtonClasses = "bg-accent text-accent-foreground hover:bg-accent/90";
const specialButtonClasses = "bg-secondary text-secondary-foreground hover:bg-secondary/80";

const CalculatorComponent = () => {
  const [input, setInput] = React.useState('');
  const [result, setResult] = React.useState('');
  const [history, setHistory] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleButtonClick = (value: string) => {
    if (result && !['+', '-', '*', '/'].includes(value)) {
      // Start new calculation after a result
      setInput(value);
      setResult('');
      setHistory('');
    } else {
      setInput(prev => prev + value);
    }
    inputRef.current?.focus();
  };

  const handleCalculate = () => {
    try {
      // Use a safer eval method if possible, but for a simple calculator this is often used.
      // Be cautious about using eval with untrusted input in real-world apps.
      const sanitizedInput = input.replace(/%/g, '/100*');
      const evalResult = eval(sanitizedInput);
      setResult(String(evalResult));
      setHistory(input + ' =');
      setInput(String(evalResult));
    } catch (error) {
      setResult('Error');
    }
  };

  const handleClear = () => {
    setInput('');
    setResult('');
    setHistory('');
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    setInput(prev => prev.slice(0, -1));
    inputRef.current?.focus();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if ((e.key >= '0' && e.key <= '9') || ['+', '-', '*', '/', '.', '%'].includes(e.key)) {
      handleButtonClick(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
      handleCalculate();
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key.toLowerCase() === 'c' || e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <Card className="w-full max-w-xs shadow-2xl border-2 border-primary/20 bg-background/80 backdrop-blur-sm overflow-hidden">
        {/* Header is now part of the draggable handle */}
        <CardHeader className="pb-2 cursor-grab active:cursor-grabbing">
            <div className="h-8 text-right text-muted-foreground text-xl pr-2 truncate">{history} {result && result !== input ? result : ''}</div>
            <Input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-16 text-4xl text-right font-mono border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pr-2 cursor-text"
            placeholder="0"
            />
        </CardHeader>
      <CardContent className="grid grid-cols-4 gap-2">
        <Button variant="ghost" className={`${buttonClasses} ${specialButtonClasses}`} onClick={handleClear}>AC</Button>
        <Button variant="ghost" className={`${buttonClasses} ${specialButtonClasses}`} onClick={handleBackspace}><Trash2 /></Button>
        <Button variant="ghost" className={`${buttonClasses} ${specialButtonClasses}`} onClick={() => handleButtonClick('%')}><Percent /></Button>
        <Button variant="ghost" className={`${buttonClasses} ${operatorButtonClasses}`} onClick={() => handleButtonClick('/')}><Divide /></Button>
        
        <Button variant="ghost" className={buttonClasses} onClick={() => handleButtonClick('7')}>7</Button>
        <Button variant="ghost" className={buttonClasses} onClick={() => handleButtonClick('8')}>8</Button>
        <Button variant="ghost" className={buttonClasses} onClick={() => handleButtonClick('9')}>9</Button>
        <Button variant="ghost" className={`${buttonClasses} ${operatorButtonClasses}`} onClick={() => handleButtonClick('*')}>&times;</Button>
        
        <Button variant="ghost" className={buttonClasses} onClick={() => handleButtonClick('4')}>4</Button>
        <Button variant="ghost" className={buttonClasses} onClick={() => handleButtonClick('5')}>5</Button>
        <Button variant="ghost" className={buttonClasses} onClick={() => handleButtonClick('6')}>6</Button>
        <Button variant="ghost" className={`${buttonClasses} ${operatorButtonClasses}`} onClick={() => handleButtonClick('-')}>-</Button>
        
        <Button variant="ghost" className={buttonClasses} onClick={() => handleButtonClick('1')}>1</Button>
        <Button variant="ghost" className={buttonClasses} onClick={() => handleButtonClick('2')}>2</Button>
        <Button variant="ghost" className={buttonClasses} onClick={() => handleButtonClick('3')}>3</Button>
        <Button variant="ghost" className={`${buttonClasses} ${operatorButtonClasses}`} onClick={() => handleButtonClick('+')}>+</Button>
        
        <Button variant="ghost" className={`${buttonClasses} col-span-2`} onClick={() => handleButtonClick('0')}>0</Button>
        <Button variant="ghost" className={buttonClasses} onClick={() => handleButtonClick('.')}>.</Button>
        <Button variant="ghost" className={`${buttonClasses} bg-primary text-primary-foreground hover:bg-primary/90`} onClick={handleCalculate}>=</Button>
      </CardContent>
    </Card>
  );
};


interface DraggableCalculatorProps {
  onClose: () => void;
}

const DraggableCalculator: React.FC<DraggableCalculatorProps> = ({ onClose }) => {
    const {attributes, listeners, setNodeRef, transform} = useDraggable({
        id: 'draggable-calculator',
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : {};
    
    return (
        <div ref={setNodeRef} style={style} className="p-4 rounded-lg absolute z-[9999] top-1/4 left-1/4">
             <div className="relative" {...attributes} {...listeners} >
                <CalculatorComponent />
                <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-destructive text-destructive-foreground shadow-lg" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

interface CalculatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalculatorDialog: React.FC<CalculatorDialogProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
        // Remove the backdrop and centering classes to make it a true floating widget
        <div className="fixed inset-0 z-[100] pointer-events-none print:hidden">
            <div className="relative w-full h-full pointer-events-auto">
                 <div onClick={(e) => e.stopPropagation()}>
                    <DraggableCalculator onClose={onClose} />
                 </div>
            </div>
        </div>
    );
};
