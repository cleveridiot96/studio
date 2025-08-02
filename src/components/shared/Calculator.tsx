
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Percent, Divide, History as HistoryIcon, Calculator as CalculatorIcon, Trash2, GripVertical } from 'lucide-react';
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
          const sanitizedInput = input
            .replace(/%/g, '/100*')
            .replace(/([+\-*/]){2,}/g, '$1');
            
          if (/[^0-9+\-*/.() ]/.test(sanitizedInput)) {
              setResult('Error');
              return;
          }

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

    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => { setIsMounted(true); }, []);
    
    const [position, setPosition] = useLocalStorageState({ x: isMounted ? window.innerWidth - 370 : 0, y: isMounted ? window.innerHeight - 620 : 0 }, 'calculatorPosition');
    const [size, setSize] = useLocalStorageState({ width: 340, height: 520 }, 'calculatorSize');
    
    const isDragging = React.useRef(false);
    const isResizing = React.useRef<string | null>(null);
    const initialPos = React.useRef({ x: 0, y: 0 });

    const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        isDragging.current = true;
        initialPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        document.addEventListener('mousemove', handleDragMouseMove);
        document.addEventListener('mouseup', handleDragMouseUp);
    };

    const handleDragMouseMove = (e: MouseEvent) => {
        if (isDragging.current) {
            setPosition({ x: e.clientX - initialPos.current.x, y: e.clientY - initialPos.current.y });
        }
    };

    const handleDragMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleDragMouseMove);
        document.removeEventListener('mouseup', handleDragMouseUp);
    };
    
    const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        e.preventDefault();
        isResizing.current = direction;
        initialPos.current = { x: e.clientX, y: e.clientY, ...size, ...position };
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', handleResizeMouseUp);
    };
    
    const handleResizeMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const { clientX, clientY } = e;
        const dx = clientX - initialPos.current.x;
        const dy = clientY - initialPos.current.y;
        
        let newWidth = size.width;
        let newHeight = size.height;
        let newX = position.x;
        let newY = position.y;

        if (isResizing.current.includes('right')) newWidth = Math.max(300, initialPos.current.width + dx);
        if (isResizing.current.includes('bottom')) newHeight = Math.max(400, initialPos.current.height + dy);
        if (isResizing.current.includes('left')) {
            newWidth = Math.max(300, initialPos.current.width - dx);
            if (newWidth > 300) newX = initialPos.current.x + dx;
        }
        if (isResizing.current.includes('top')) {
            newHeight = Math.max(400, initialPos.current.height - dy);
            if(newHeight > 400) newY = initialPos.current.y + dy;
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
    };
    
    const handleResizeMouseUp = () => {
        isResizing.current = null;
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
    };

    const resizeHandles = [
        { direction: 'top', cursor: 'ns-resize', className: 'h-2 top-0 left-2 right-2' },
        { direction: 'bottom', cursor: 'ns-resize', className: 'h-2 bottom-0 left-2 right-2' },
        { direction: 'left', cursor: 'ew-resize', className: 'w-2 top-2 bottom-2 left-0' },
        { direction: 'right', cursor: 'ew-resize', className: 'w-2 top-2 bottom-2 right-0' },
        { direction: 'top-left', cursor: 'nwse-resize', className: 'h-4 w-4 top-0 left-0' },
        { direction: 'top-right', cursor: 'nesw-resize', className: 'h-4 w-4 top-0 right-0' },
        { direction: 'bottom-left', cursor: 'nesw-resize', className: 'h-4 w-4 bottom-0 left-0' },
        { direction: 'bottom-right', cursor: 'nwse-resize', className: 'h-4 w-4 bottom-0 right-0' },
    ];
    
    return (
        <AnimatePresence>
            {isVisible && isMounted && (
                <motion.div
                    ref={calcRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="fixed z-[100]"
                    style={{
                        width: `${size.width}px`,
                        height: `${size.height}px`,
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                    }}
                >
                    <Card className="w-full h-full shadow-2xl border-2 border-primary/20 bg-background/80 backdrop-blur-sm overflow-hidden flex flex-col relative">
                       {resizeHandles.map(({direction, cursor, className}) => (
                           <div key={direction} onMouseDown={e => handleResizeMouseDown(e, direction)} className={`absolute ${className}`} style={{cursor}}/>
                       ))}
                        
                        <div onMouseDown={handleDragMouseDown} className="flex justify-center items-center py-1 text-muted-foreground cursor-move flex-shrink-0" title="Drag Calculator">
                           <GripVertical className="h-5 w-5" />
                        </div>

                        <CardHeader className="pb-2 pt-0 flex-shrink-0">
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

  return (
    <>
      <FloatingCalculator isVisible={isOpen} onClose={() => setIsOpen(false)} />
      <FloatingActionButton isCalcOpen={isOpen} onClick={() => setIsOpen(prev => !prev)} />
    </>
  );
};
