
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, GripVertical } from "lucide-react"

import { cn } from "@/lib/utils"
import { useLocalStorageState } from "@/hooks/useLocalStorageState"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { isDraggable?: boolean }
>(({ className, children, isDraggable = true, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null)
  
  const [position, setPosition] = useLocalStorageState('dialogPosition', { x: 0, y: 0 });
  const [size, setSize] = useLocalStorageState('dialogSize', { width: 512, height: 'auto' });
  const [isFirstMount, setIsFirstMount] = React.useState(true);
  
  const isDragging = React.useRef(false);
  const isResizing = React.useRef<string | null>(null);
  const dragStartPos = React.useRef({ x: 0, y: 0 });
  const initialFrame = React.useRef({ x: 0, y: 0, width: 0, height: 0 });

  React.useEffect(() => {
    if (isFirstMount) {
        // Center on first mount only
        setPosition({ 
          x: (window.innerWidth - (typeof size.width === 'number' ? size.width : 512)) / 2,
          y: (window.innerHeight - 600) / 2 // Assume a default height for centering
        });
        setIsFirstMount(false);
    }
  }, [isFirstMount, setPosition, size.width]);


  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggable) return;
    e.preventDefault();
    isDragging.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    initialFrame.current = { ...position, width: contentRef.current?.offsetWidth || 0, height: contentRef.current?.offsetHeight || 0 };
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
    initialFrame.current = { ...position, width: contentRef.current?.offsetWidth || 0, height: contentRef.current?.offsetHeight || 0 };
    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', handleResizeMouseUp, { once: true });
  };
  
  const handleResizeMouseMove = (e: MouseEvent) => {
    if (!isResizing.current || !contentRef.current) return;
    const { clientX, clientY } = e;
    const dx = clientX - dragStartPos.current.x;
    const dy = clientY - dragStartPos.current.y;
    
    let newWidth = initialFrame.current.width;
    let newHeight = initialFrame.current.height;
    let newX = initialFrame.current.x;
    let newY = initialFrame.current.y;

    if (isResizing.current.includes('right')) newWidth = Math.max(400, initialFrame.current.width + dx);
    if (isResizing.current.includes('bottom')) newHeight = Math.max(400, initialFrame.current.height + dy);
    if (isResizing.current.includes('left')) {
        const tempWidth = Math.max(400, initialFrame.current.width - dx);
        if(tempWidth > 400) {
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
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        className={cn(
          "fixed z-50 grid w-full gap-4 border bg-background p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
          className
        )}
        style={isDraggable ? {
          top: `${position.y}px`,
          left: `${position.x}px`,
          width: `${size.width}px`,
          transform: 'none', // Override translate
        } : {}}
        {...props}
      >
        {isDraggable && (
          <>
            <div onMouseDown={handleDragMouseDown} className="absolute top-0 left-0 right-0 h-12 flex justify-center items-center text-muted-foreground cursor-move" title="Drag">
              <GripVertical />
            </div>
            {resizeHandles.map(({direction, cursor, className}) => (
              <div key={direction} onMouseDown={e => handleResizeMouseDown(e, direction)} className={`absolute ${className}`} style={{cursor}}/>
            ))}
          </>
        )}
        <div className="flex flex-col h-full">
            {children}
        </div>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName


const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left pt-8", // Added padding top for drag handle
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-auto", // Push footer to bottom
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
