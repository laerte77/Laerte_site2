const DialogContent=React.forwardRef(({className,children,onClose,...props},ref)=>(
 <DialogPortal>
  <DialogOverlay/>
  <DialogPrimitive.Content
   ref={ref}
   className={cn(
    'dialog-content-responsive fixed z-50 grid w-full max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-b-lg border bg-background p-6 shadow-lg overscroll-contain animate-in data-[state=open]:fade-in-90 data-[state=open]:slide-in-from-bottom-10 sm:max-w-lg sm:rounded-lg sm:zoom-in-90 data-[state=open]:sm:slide-in-from-bottom-0 motion-reduce:animate-none',
    className
   )}
   onInteractOutside={e=>e.preventDefault()}
   onPointerDownOutside={e=>e.preventDefault()}
   onEscapeKeyDown={e=>e.preventDefault()}
   {...props}
  >
   {children}

   <button
    type="button"
    onClick={onClose}
    className="absolute right-3 top-3 z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground opacity-70 transition-[background-color,color,opacity] duration-200 hover:bg-accent hover:text-foreground hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    aria-label="Fechar janela"
   >
    <X className="h-5 w-5" aria-hidden="true"/>
    <span className="sr-only">Fechar</span>
   </button>
  </DialogPrimitive.Content>
 </DialogPortal>
));
