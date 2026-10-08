import React from'react';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';

const THEMES={
 blue:{color:'hsl(214 100% 60%)',border:'hsl(214 100% 60% / .30)',soft:'hsl(214 100% 60% / .07)',glow:'hsl(214 100% 60% / .18)'},
 red:{color:'hsl(0 84% 60%)',border:'hsl(0 84% 60% / .30)',soft:'hsl(0 84% 60% / .07)',glow:'hsl(0 84% 60% / .18)'},
 green:{color:'hsl(142 71% 45%)',border:'hsl(142 71% 45% / .30)',soft:'hsl(142 71% 45% / .07)',glow:'hsl(142 71% 45% / .18)'},
 gold:{color:'hsl(51 100% 50%)',border:'hsl(51 100% 50% / .30)',soft:'hsl(51 100% 50% / .07)',glow:'hsl(51 100% 50% / .18)'},
 orange:{color:'hsl(16 100% 60%)',border:'hsl(16 100% 60% / .30)',soft:'hsl(16 100% 60% / .07)',glow:'hsl(16 100% 60% / .18)'}
};

export default function ModalLancamentoPadrao({open,onClose,title,description,icon:Icon,theme='blue',children,footer}){
 const t=THEMES[theme]||THEMES.blue;

 return(
  <Dialog open={open} onOpenChange={()=>{}}>
   <DialogContent
    onInteractOutside={e=>e.preventDefault()}
    onPointerDownOutside={e=>e.preventDefault()}
    onEscapeKeyDown={e=>e.preventDefault()}
    className="w-[calc(100%-2rem)] max-w-[620px] overflow-hidden rounded-[24px] border-0 bg-[hsl(var(--card-bg))] p-0 text-foreground shadow-[0_30px_100px_rgba(0,0,0,.65)]"
    style={{border:`1px solid ${t.border}`,boxShadow:`0 30px 100px rgba(0,0,0,.65),0 0 35px ${t.glow}`}}
   >
    <div className="h-[3px] w-full" style={{background:t.color}}/>

    <DialogHeader
     className="px-7 pb-6 pt-6"
     style={{background:`linear-gradient(180deg,${t.soft},transparent)`}}
    >
     <div className="flex items-start gap-4">
      {Icon&&(
       <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
        style={{background:t.soft,border:`1px solid ${t.border}`,boxShadow:`0 0 20px ${t.glow}`}}
       >
        <Icon className="h-5 w-5" style={{color:t.color}}/>
       </div>
      )}

      <div className="min-w-0 flex-1 pr-8">
       <DialogTitle className="text-[22px] font-bold tracking-tight">
        {title}
       </DialogTitle>

       {description&&(
        <DialogDescription className="mt-1.5 text-sm leading-6 text-muted-foreground">
         {description}
        </DialogDescription>
       )}
      </div>
     </div>
    </DialogHeader>

    <div className="px-7 py-6">
     <div className="space-y-5">{children}</div>
    </div>

    <DialogFooter
     className="flex flex-col-reverse gap-3 border-t px-7 py-5 sm:flex-row sm:justify-end"
     style={{
      borderColor:'hsl(var(--border) / .75)',
      background:'hsl(var(--background) / .18)'
     }}
    >
     {footer}
    </DialogFooter>
   </DialogContent>
  </Dialog>
 );
}
