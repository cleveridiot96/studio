
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Percent, Divide, Trash2, History as HistoryIcon, Calculator as CalculatorIcon, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { useLocalStorageState } from '@/hooks/useLocalStorageState';

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
          const sanitizedInput = input.replace(/%/g, '/100*');
          const evalResult = eval(sanitizedInput);
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
    };

    return {
        input, setInput, result, setResult, history,
        handleButtonClick, handleCalculate, handleClear, handleBackspace, handleKeyDown, handleHistoryClick, inputRef
    }
};

const FloatingCalculator = ({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) => {
    const calcState = useCalculatorState();
    const dragControls = useDragControls();
    const [position, setPosition] = useLocalStorageState('calculatorPos', { x: window.innerWidth - 340, y: window.innerHeight - 560 });
    const [size, setSize] = useLocalStorageState('calculatorSize', { width: 320, height: 500 });
    const calcRef = React.useRef<HTMLDivElement>(null);

    const startResize = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const onMouseMove = (moveEvent: MouseEvent) => {
            setSize(prevSize => {
                const newWidth = Math.max(280, Math.min(600, prevSize.width + moveEvent.movementX));
                const newHeight = Math.max(400, Math.min(700, prevSize.height + moveEvent.movementY));
                return { width: newWidth, height: newHeight };
            });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [setSize]);


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
        };
    }, [isVisible, onClose]);
    
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    ref={calcRef}
                    drag
                    dragListener={false}
                    dragControls={dragControls}
                    dragMomentum={false}
                    style={{ x: position.x, y: position.y, width: size.width, height: size.height }}
                    initial={{ scale: 0.5, opacity: 0, y: 50, x: 50, originX: 'bottom right', originY: 'bottom right' }}
                    animate={{ scale: 1, opacity: 1, y: 0, x: 0 }}
                    exit={{ scale: 0.5, opacity: 0, y: 50, x: 50 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed z-[100] cursor-grab active:cursor-grabbing"
                >
                    <Card className="w-full h-full shadow-2xl border-2 border-primary/20 bg-background/80 backdrop-blur-sm overflow-hidden flex flex-col">
                        <div onPointerDown={(e) => dragControls.start(e)} className="flex-shrink-0 cursor-grab active:cursor-grabbing p-2">
                           <button onClick={onClose} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors p-1" title="Close Calculator">
                                <X className="h-5 w-5" />
                           </button>
                            <Popover>
                                <PopoverTrigger asChild>
                                     <button className="absolute top-2 left-2 text-muted-foreground hover:text-foreground transition-colors p-1" title="Calculation History">
                                        <HistoryIcon className="h-5 w-5" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent>
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
                        </div>
                        <CardHeader className="pb-2 pt-0 flex-shrink-0">
                            <div className="h-8 text-right text-muted-foreground text-xl pr-2 truncate">
                                {calcState.result && calcState.result !== calcState.input ? calcState.input : ''}
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
                            <Button variant="ghost" className={`${specialButtonClasses} w-full h-full text-lg`} onClick={calcState.handleClear}>AC</Button>
                            <Button variant="ghost" className={`${specialButtonClasses} w-full h-full text-lg`} onClick={calcState.handleBackspace}><Trash2 /></Button>
                            <Button variant="ghost" className={`${specialButtonClasses} w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('%')}><Percent /></Button>
                            <Button variant="ghost" className={`${operatorButtonClasses} w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('/')}><Divide /></Button>
                            
                            <Button variant="ghost" className={`w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('7')}>7</Button>
                            <Button variant="ghost" className={`w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('8')}>8</Button>
                            <Button variant="ghost" className={`w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('9')}>9</Button>
                            <Button variant="ghost" className={`${operatorButtonClasses} w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('*')}>&times;</Button>
                            
                            <Button variant="ghost" className={`w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('4')}>4</Button>
                            <Button variant="ghost" className={`w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('5')}>5</Button>
                            <Button variant="ghost" className={`w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('6')}>6</Button>
                            <Button variant="ghost" className={`${operatorButtonClasses} w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('-')}>-</Button>
                            
                            <Button variant="ghost" className={`w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('1')}>1</Button>
                            <Button variant="ghost" className={`w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('2')}>2</Button>
                            <Button variant="ghost" className={`w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('3')}>3</Button>
                            <Button variant="ghost" className={`${operatorButtonClasses} w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('+')}>+</Button>
                            
                            <Button variant="ghost" className={`w-full h-full text-lg col-span-2`} onClick={() => calcState.handleButtonClick('0')}>0</Button>
                            <Button variant="ghost" className={`w-full h-full text-lg`} onClick={() => calcState.handleButtonClick('.')}>.</Button>
                            <Button variant="ghost" className={`w-full h-full text-lg bg-primary text-primary-foreground hover:bg-primary/90`} onClick={calcState.handleCalculate}>=</Button>
                        </CardContent>
                         <div
                            onMouseDown={startResize}
                            className="absolute bottom-0 right-0 cursor-nwse-resize p-2 text-muted-foreground/50 hover:text-muted-foreground z-10"
                         >
                            <GripVertical className="h-4 w-4 -rotate-45" />
                        </div>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const FloatingCalculatorButton = ({ onClick }: { onClick: () => void }) => (
    <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
        <div className="fixed bottom-6 right-6">
            <Button
                size="icon"
                className="w-16 h-16 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                aria-label="Open Calculator"
                onClick={onClick}
            >
                <CalculatorIcon className="h-8 w-8" />
            </Button>
        </div>
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
    <div className="fixed bottom-6 right-6 z-50 print:hidden">
        <AnimatePresence>
            {!isOpen && <FloatingCalculatorButton onClick={() => setIsOpen(true)} />}
        </AnimatePresence>
        <FloatingCalculator isVisible={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};
