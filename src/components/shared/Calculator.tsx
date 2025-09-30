
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
          if (!input.trim() || /[+\-*/.%]$/.test(input.trim())) return;

          const sanitizedInput = input
            .replace(/%/g, '/100*')
            .replace(/([+\-*/]){2,}/g, '$1');
            
          if (/[^0-9+\-*/.() ]/.test(sanitizedInput)) {
              setResult('Error');
              return;
          }

          const evalResult = new Function(`return ${sanitizedInput}`)();
          if (typeof evalResult !== 'number' || !isFinite(evalResult)) {
            setResult('Error');
            return;
          }
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
        history, handleButtonClick, handleCalculate, handleClear, handleBackspace, handleKeyDown, handleHistoryClick, inputRef, setHistory
    }
};

export const Calculator = ({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) => {
    const calcState = useCalculatorState();
    const calcRef = React.useRef<HTMLDivElement>(null);

    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => { setIsMounted(true); }, []);
    
    const [position, setPosition] = useLocalStorageState('calculatorPosition', { x: typeof window !== 'undefined' ? window.innerWidth - 370 : 0, y: 80 });
    const [size, setSize] = useLocalStorageState('calculatorSize', { width: 340, height: 520 });
    
    const isDragging = React.useRef(false);
    const isResizing = React.useRef<string | null>(null);
    const dragStartPos = React.useRef({ x: 0, y: 0 });
    const initialFrame = React.useRef({ x: 0, y: 0, width: 0, height: 0 });

    const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        isDragging.current = true;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        initialFrame.current = { ...position, ...size };
        document.addEventListener('mousemove', handleDragMouseMove);
        document.addEventListener('mouseup', handleDragMouseUp, { once: true });
    };

    const handleDragMouseMove = (e: MouseEvent) => {
        if (isDragging.current) {
            const dx = e.clientX - dragStartPos.current.x;
            const dy = e.clientY - dragStartPos.current.y;
            setPosition({ x: initialFrame.current.x + dx, y: initialFrame.current.y + dy });
        }
    };

    const handleDragMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleDragMouseMove);
    };
    
    const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        e.preventDefault();
        isResizing.current = direction;
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        initialFrame.current = { ...position, ...size };
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', handleResizeMouseUp, { once: true });
    };
    
    const handleResizeMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const { clientX, clientY } = e;
        const dx = clientX - dragStartPos.current.x;
        const dy = clientY - dragStartPos.current.y;
        
        let newWidth = initialFrame.current.width;
        let newHeight = initialFrame.current.height;
        let newX = initialFrame.current.x;
        let newY = initialFrame.current.y;

        if (isResizing.current.includes('right')) newWidth = Math.max(300, initialFrame.current.width + dx);
        if (isResizing.current.includes('bottom')) newHeight = Math.max(400, initialFrame.current.height + dy);
        if (isResizing.current.includes('left')) {
            const tempWidth = Math.max(300, initialFrame.current.width - dx);
            if(tempWidth > 300) {
              newWidth = tempWidth;
              newX = initialFrame.current.x + dx;
            }
        }
        if (isResizing.current.includes('top')) {
            const tempHeight = Math.max(400, initialFrame.current.height - dy);
            if(tempHeight > 400) {
              newHeight = tempHeight;
              newY = initialFrame.current.y + dy;
            }
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
    };
    
    const handleResizeMouseUp = () => {
        isResizing.current = null;
        document.removeEventListener('mousemove', handleResizeMouseMove);
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
        };
    }, [isVisible, onClose]);


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
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
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
                        
                        <div onMouseDown={handleDragMouseDown} className="flex justify-between items-center py-1 text-muted-foreground cursor-move flex-shrink-0" title="Drag Calculator">
                           <div className="w-8"></div>
                           <GripVertical className="h-5 w-5" />
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground cursor-pointer" title="Close Calculator" onClick={onClose}><X className="h-5 w-5"/></Button>
                        </div>

                        <CardHeader className="pb-2 pt-0 flex-shrink-0">
                            <div className="flex justify-between items-center h-8">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Calculation History"><HistoryIcon className="h-5 w-5" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="z-[101]">
                                        <div className="flex justify-between items-center mb-2">
                                          <p className="text-sm font-medium">History</p>
                                          <Button variant="destructive" size="icon" className="h-6 w-6" onClick={() => calcState.setHistory([])}><Trash2 className="h-3 w-3"/></Button>
                                        </div>
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
