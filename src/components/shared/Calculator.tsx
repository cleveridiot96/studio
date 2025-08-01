
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Percent, Divide, Trash2, History as HistoryIcon, Calculator as CalculatorIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '../ui/scroll-area';

const buttonClasses = "text-xl h-14 w-14 rounded-full shadow-md";
const operatorButtonClasses = "bg-accent text-accent-foreground hover:bg-accent/90";
const specialButtonClasses = "bg-secondary text-secondary-foreground hover:bg-secondary/80";

interface HistoryEntry {
  expression: string;
  result: string;
}

const useCalculatorState = () => {
    const [input, setInput] = React.useState('');
    const [result, setResult] = React.useState('');
    const [displayHistory, setDisplayHistory] = React.useState<HistoryEntry[]>([]);
    const [isHistoryVisible, setIsHistoryVisible] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleButtonClick = (value: string) => {
        if (result && !['+', '-', '*', '/'].includes(value)) {
          setInput(value);
          setResult('');
        } else {
          setInput(prev => prev + value);
        }
        inputRef.current?.focus();
    };
    
    const handleCalculate = () => {
        try {
          if (!input || /[+\-*/.]$/.test(input)) return;
          const sanitizedInput = input.replace(/%/g, '/100*');
          const evalResult = eval(sanitizedInput);
          const resultString = String(evalResult);
          
          setResult(resultString);
          const newEntry = { expression: input, result: resultString };
          setDisplayHistory(prev => [newEntry, ...prev.slice(0, 9)]);
          setInput(resultString);
          setIsHistoryVisible(false); // Hide history after a calculation
        } catch (error) {
          setResult('Error');
        }
    };

    const handleClear = () => {
        setInput('');
        setResult('');
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
    
    const handleHistoryClick = (entry: HistoryEntry) => {
        setInput(entry.result);
        setResult('');
        setIsHistoryVisible(false);
    };

    return {
        input, setInput, result, setResult, displayHistory, isHistoryVisible, setIsHistoryVisible,
        handleButtonClick, handleCalculate, handleClear, handleBackspace, handleKeyDown, handleHistoryClick, inputRef
    }
};

export const Calculator = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const calcState = useCalculatorState();

  const handleEnter = () => {
    // Optionally close calculator on pressing '='
    // setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
             <motion.div
                className="fixed bottom-6 right-6 z-50 print:hidden"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
            >
                <Button
                    size="icon"
                    className="w-16 h-16 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                    aria-label="Open Calculator"
                >
                    <AnimatePresence mode="wait">
                       <motion.div
                          key={isOpen ? 'close' : 'calc'}
                          initial={{ y: -20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 20, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                       >
                           {isOpen ? <X className="h-8 w-8" /> : <CalculatorIcon className="h-8 w-8" />}
                       </motion.div>
                    </AnimatePresence>
                </Button>
            </motion.div>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-auto p-0 border-none shadow-none bg-transparent" sideOffset={16}>
             <motion.div
                initial={{ y: 50, scale: 0.5, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 50, scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="origin-bottom-right"
             >
                <Card className="w-full max-w-xs shadow-2xl border-2 border-primary/20 bg-background/80 backdrop-blur-sm overflow-hidden">
                  <CardHeader className="pb-2 relative">
                    <button onClick={() => calcState.setIsHistoryVisible(v => !v)} className="absolute top-2 left-2 text-muted-foreground hover:text-foreground transition-colors p-1" title="Calculation History">
                        <HistoryIcon className="h-5 w-5" />
                    </button>
                    <div className="h-8 text-right text-muted-foreground text-xl pr-2 truncate">
                        {calcState.result && calcState.result !== calcState.input ? calcState.result : ''}
                    </div>
                    <Input
                      ref={calcState.inputRef}
                      type="text"
                      value={calcState.input}
                      onChange={(e) => calcState.setInput(e.target.value)}
                      onKeyDown={calcState.handleKeyDown}
                      className="h-16 text-4xl text-right font-mono border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pr-2 cursor-text"
                      placeholder="0"
                      autoFocus
                    />
                    <AnimatePresence>
                        {calcState.isHistoryVisible && (
                             <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="absolute top-full left-0 w-full bg-background border-x border-b rounded-b-lg shadow-lg z-10"
                             >
                               <ScrollArea className="h-48 p-2">
                                  {calcState.displayHistory.length === 0 && <p className="text-sm text-center text-muted-foreground p-4">No history yet.</p>}
                                  {calcState.displayHistory.map((entry, index) => (
                                      <div key={index} onClick={() => calcState.handleHistoryClick(entry)} className="p-2 rounded-md hover:bg-muted cursor-pointer text-right">
                                          <p className="text-xs text-muted-foreground">{entry.expression} =</p>
                                          <p className="font-semibold text-lg">{entry.result}</p>
                                      </div>
                                  ))}
                               </ScrollArea>
                             </motion.div>
                        )}
                    </AnimatePresence>
                  </CardHeader>
                  <CardContent className="grid grid-cols-4 gap-2">
                    <Button variant="ghost" className={`${buttonClasses} ${specialButtonClasses}`} onClick={calcState.handleClear}>AC</Button>
                    <Button variant="ghost" className={`${buttonClasses} ${specialButtonClasses}`} onClick={calcState.handleBackspace}><Trash2 /></Button>
                    <Button variant="ghost" className={`${buttonClasses} ${specialButtonClasses}`} onClick={() => calcState.handleButtonClick('%')}><Percent /></Button>
                    <Button variant="ghost" className={`${buttonClasses} ${operatorButtonClasses}`} onClick={() => calcState.handleButtonClick('/')}><Divide /></Button>
                    
                    <Button variant="ghost" className={buttonClasses} onClick={() => calcState.handleButtonClick('7')}>7</Button>
                    <Button variant="ghost" className={buttonClasses} onClick={() => calcState.handleButtonClick('8')}>8</Button>
                    <Button variant="ghost" className={buttonClasses} onClick={() => calcState.handleButtonClick('9')}>9</Button>
                    <Button variant="ghost" className={`${buttonClasses} ${operatorButtonClasses}`} onClick={() => calcState.handleButtonClick('*')}>&times;</Button>
                    
                    <Button variant="ghost" className={buttonClasses} onClick={() => calcState.handleButtonClick('4')}>4</Button>
                    <Button variant="ghost" className={buttonClasses} onClick={() => calcState.handleButtonClick('5')}>5</Button>
                    <Button variant="ghost" className={buttonClasses} onClick={() => calcState.handleButtonClick('6')}>6</Button>
                    <Button variant="ghost" className={`${buttonClasses} ${operatorButtonClasses}`} onClick={() => calcState.handleButtonClick('-')}>-</Button>
                    
                    <Button variant="ghost" className={buttonClasses} onClick={() => calcState.handleButtonClick('1')}>1</Button>
                    <Button variant="ghost" className={buttonClasses} onClick={() => calcState.handleButtonClick('2')}>2</Button>
                    <Button variant="ghost" className={buttonClasses} onClick={() => calcState.handleButtonClick('3')}>3</Button>
                    <Button variant="ghost" className={`${buttonClasses} ${operatorButtonClasses}`} onClick={() => calcState.handleButtonClick('+')}>+</Button>
                    
                    <Button variant="ghost" className={`${buttonClasses} col-span-2`} onClick={() => calcState.handleButtonClick('0')}>0</Button>
                    <Button variant="ghost" className={buttonClasses} onClick={() => calcState.handleButtonClick('.')}>.</Button>
                    <Button variant="ghost" className={`${buttonClasses} bg-primary text-primary-foreground hover:bg-primary/90`} onClick={calcState.handleCalculate}>=</Button>
                  </CardContent>
                </Card>
            </motion.div>
        </PopoverContent>
    </Popover>
  );
};
