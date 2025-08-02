
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Percent, Divide, History as HistoryIcon, Calculator as CalculatorIcon, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';

const operatorButtonClasses = "bg-accent text-accent-foreground hover:bg-accent/90";
const specialButtonClasses = "bg-secondary text-secondary-foreground hover:bg-secondary/80";

interface HistoryEntry {
  expression: string;
  result: string;
}

const useCalculatorState = () => {
    const [input, setInput] = React.useState('');
    const [result, setResult] = React.useState('');
    const [history, setHistory] = useLocalStorageState<HistoryEntry[]>('calculatorHistory', []);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleButtonClick = (value: string) => {
        if (result && !['+', '-', '*', '/'].includes(value) && input === result) {
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
          // A slightly safer eval by replacing multiple operators and sanitizing.
          const sanitizedInput = input
            .replace(/%/g, '/100*')
            .replace(/([+\-*/]){2,}/g, '$1'); // Replace multiple operators with the last one
            
          // Basic validation to prevent function calls.
          if (/[^0-9+\-*/.() ]/.test(sanitizedInput)) {
              setResult('Error');
              return;
          }

          // Using Function constructor for a slightly safer eval
          const evalResult = new Function(`return ${sanitizedInput}`)();
          
          const resultString = String(parseFloat(evalResult.toFixed(10)));
          
          setResult(resultString);
          if(input !== resultString) {
            const newEntry = { expression: input, result: resultString };
            setHistory(prev => [newEntry, ...prev.slice(0, 19)]);
          }
          setInput(resultString);
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
        if ((e.key >= '0' && e.key <= '9') || ['+', '-', '*', '/', '.', '%'].includes(e.key)) {
          e.preventDefault();
          handleButtonClick(e.key);
        } else if (e.key === 'Enter' || e.key === '=') {
          e.preventDefault();
          handleCalculate();
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handleBackspace();
        } else if (e.key.toLowerCase() === 'c' || e.key === 'Escape') {
          e.preventDefault();
          handleClear();
        }
    };
    
    const handleHistoryClick = (entry: HistoryEntry) => {
        setInput(entry.result);
        setResult('');
    };

    return {
        input, setInput, result,
        history, handleButtonClick, handleCalculate, handleClear, handleBackspace, handleKeyDown, handleHistoryClick, inputRef
    }
};

const FloatingCalculator = ({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) => {
    const calcState = useCalculatorState();
    const calcRef = React.useRef<HTMLDivElement>(null);
    const [size, setSize] = useLocalStorageState({ width: 320, height: 500 }, 'calculatorSize');
    const isResizing = React.useRef(false);

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', handleResizeMouseUp);
    };

    const handleResizeMouseMove = (e: MouseEvent) => {
        if (isResizing.current) {
            setSize(prevSize => ({
                width: Math.max(300, prevSize.width + e.movementX),
                height: Math.max(400, prevSize.height + e.movementY),
            }));
        }
    };
    
    const handleResizeMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
    };
    
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calcRef.current && !calcRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('mousemove', handleResizeMouseMove);
            document.removeEventListener('mouseup', handleResizeMouseUp);
        };
    }, [isVisible, onClose]);
    
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    ref={calcRef}
                    initial={{ opacity: 0, y: 50, scale: 0.9, originY: 'bottom', originX: 'right' }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed bottom-[90px] right-6 z-[100]"
                    style={{ width: `${size.width}px`, height: `${size.height}px` }}
                >
                    <Card className="w-full h-full shadow-2xl border-2 border-primary/20 bg-background/80 backdrop-blur-sm overflow-hidden flex flex-col relative">
                        <CardHeader className="pb-2 pt-2 flex-shrink-0">
                             <div className="flex justify-between items-center h-8">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Calculation History"><HistoryIcon className="h-5 w-5" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <p className="text-sm font-medium mb-2">History</p>
                                        <ScrollArea className="h-48 p-2">
                                            {calcState.history.length === 0 && <p className="text-sm text-center text-muted-foreground p-4">No history yet.</p>}
                                            {calcState.history.map((entry, index) => (
                                                <div key={index} onClick={() => { calcState.handleHistoryClick(entry)}} className="p-2 rounded-md hover:bg-muted cursor-pointer text-right">
                                                    <p className="text-xs text-muted-foreground">{entry.expression} =</p>
                                                    <p className="font-semibold text-lg">{entry.result}</p>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>
                                <div className="text-right text-muted-foreground text-xl pr-2 truncate">
                                    {calcState.result && calcState.result !== calcState.input ? calcState.input : ''}
                                </div>
                            </div>
                            <Input
                                ref={calcState.inputRef}
                                type="text"
                                value={calcState.result || calcState.input}
                                onChange={(e) => calcState.setInput(e.target.value)}
                                onKeyDown={calcState.handleKeyDown}
                                className="h-16 text-4xl text-right font-mono border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent pr-2 cursor-text"
                                placeholder="0"
                                autoFocus
                                onFocus={(e) => e.target.select()}
                            />
                        </CardHeader>
                        <CardContent className="grid grid-cols-4 gap-2 flex-grow p-4">
                            <Button variant="ghost" className={`${specialButtonClasses} h-full w-full text-lg`} onClick={calcState.handleClear}>AC</Button>
                            <Button variant="ghost" className={`${specialButtonClasses} h-full w-full text-lg`} onClick={calcState.handleBackspace}><Trash2 /></Button>
                            <Button variant="ghost" className={`${specialButtonClasses} h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('%')}><Percent /></Button>
                            <Button variant="ghost" className={`${operatorButtonClasses} h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('/')}><Divide /></Button>
                            
                            <Button variant="ghost" className={`h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('7')}>7</Button>
                            <Button variant="ghost" className={`h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('8')}>8</Button>
                            <Button variant="ghost" className={`h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('9')}>9</Button>
                            <Button variant="ghost" className={`${operatorButtonClasses} h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('*')}>&times;</Button>
                            
                            <Button variant="ghost" className={`h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('4')}>4</Button>
                            <Button variant="ghost" className={`h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('5')}>5</Button>
                            <Button variant="ghost" className={`h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('6')}>6</Button>
                            <Button variant="ghost" className={`${operatorButtonClasses} h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('-')}>-</Button>
                            
                            <Button variant="ghost" className={`h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('1')}>1</Button>
                            <Button variant="ghost" className={`h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('2')}>2</Button>
                            <Button variant="ghost" className={`h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('3')}>3</Button>
                            <Button variant="ghost" className={`${operatorButtonClasses} h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('+')}>+</Button>
                            
                            <Button variant="ghost" className={`h-full w-full text-lg col-span-2`} onClick={() => calcState.handleButtonClick('0')}>0</Button>
                            <Button variant="ghost" className={`h-full w-full text-lg`} onClick={() => calcState.handleButtonClick('.')}>.</Button>
                            <Button variant="ghost" className={`h-full w-full text-lg bg-primary text-primary-foreground hover:bg-primary/90`} onClick={calcState.handleCalculate}>=</Button>
                        </CardContent>
                         <div
                            onMouseDown={handleResizeMouseDown}
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
                            title="Resize Calculator"
                        >
                           <div className="w-2 h-2 border-r-2 border-b-2 border-muted-foreground/50 absolute bottom-1 right-1" />
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const FloatingActionButton = ({ isCalcOpen, onClick }: { isCalcOpen: boolean, onClick: () => void }) => (
    <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
        className="fixed bottom-6 right-6 z-50 print:hidden"
    >
        <Button
            size="icon"
            className="w-16 h-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-transform duration-200"
            style={{ transform: isCalcOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}
            aria-label={isCalcOpen ? "Close Calculator" : "Open Calculator"}
            onClick={onClick}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={isCalcOpen ? 'close' : 'open'}
                    initial={{ rotate: -45, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 45, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                >
                    {isCalcOpen ? <X className="h-8 w-8" /> : <CalculatorIcon className="h-8 w-8" />}
                </motion.div>
            </AnimatePresence>
        </Button>
    </motion.div>
);


export const Calculator = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <>
      <FloatingCalculator isVisible={isOpen} onClose={() => setIsOpen(false)} />
      <FloatingActionButton isCalcOpen={isOpen} onClick={() => setIsOpen(prev => !prev)} />
    </>
  );
};
