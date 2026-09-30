import React from'react';
import*as DialogPrimitive from'@radix-ui/react-dialog';
import{X}from'lucide-react';
import{cn}from'@/lib/utils';

const Dialog=DialogPrimitive.Root;
const DialogTrigger=DialogPrimitive.Trigger;
const DialogClose=DialogPrimitive.Close;

const DialogPortal=({className,children,...props})=><DialogPrimitive.Portal className={cn(className)} {...props}>
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
  {children}
 </div>
</DialogPrimitive.Portal>;

DialogPortal.displayName=DialogPrimitive.Portal.displayName;

const DialogOverlay=React.forwardRef(({className,...props},ref)=>(
 <DialogPrimitive.Overlay ref={ref} className={cn(
  'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-[opacity,background-color] duration-150 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in motion-reduce:transition-none',
  className
 )} {...props}/>
));
DialogOverlay.displayName=DialogPrimitive.Overlay.displayName;

const DialogContent=React.forwardRef(({className,children,...props},ref)=>(
 <DialogPortal>
  <DialogOverlay/>
  <DialogPrimitive.Content ref={ref} className={cn(
   'dialog-content-responsive fixed z-50 grid w-full max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-b-lg border bg-background p-6 shadow-lg overscroll-contain animate-in data-[state=open]:fade-in-90 data-[state=open]:slide-in-from-bottom-10 sm:max-w-lg sm:rounded-lg sm:zoom-in-90 data-[state=open]:sm:slide-in-from-bottom-0 motion-reduce:animate-none',
   className
  )} {...props}>
   {children}

   <DialogPrimitive.Close className="absolute right-3 top-3 z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground opacity-70 ring-offset-background transition-[background-color,color,opacity] duration-200 ease-out hover:bg-accent hover:text-foreground hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground touch-target motion-reduce:transition-none" aria-label="Fechar janela">
    <X className="h-5 w-5" aria-hidden="true"/>
    <span className="sr-only">Fechar</span>
   </DialogPrimitive.Close>
  </DialogPrimitive.Content>
 </DialogPortal>
));
DialogContent.displayName=DialogPrimitive.Content.displayName;

const DialogHeader=({className,...props})=><div className={cn('flex flex-col space-y-1.5 text-center sm:text-left',className)} {...props}/>;
DialogHeader.displayName='DialogHeader';

const DialogFooter=({className,...props})=><div className={cn('mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2',className)} {...props}/>;
DialogFooter.displayName='DialogFooter';

const DialogTitle=React.forwardRef(({className,...props},ref)=><DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight',className)} {...props}/>);
DialogTitle.displayName=DialogPrimitive.Title.displayName;

const DialogDescription=React.forwardRef(({className,...props},ref)=><DialogPrimitive.Description ref={ref} className={cn('text-sm leading-relaxed text-muted-foreground',className)} {...props}/>);
DialogDescription.displayName=DialogPrimitive.Description.displayName;

export{Dialog,DialogTrigger,DialogContent,DialogHeader,DialogFooter,DialogTitle,DialogDescription,DialogClose};
