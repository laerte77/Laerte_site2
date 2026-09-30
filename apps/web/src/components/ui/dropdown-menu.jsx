import React from'react';
import*as DropdownMenuPrimitive from'@radix-ui/react-dropdown-menu';
import{Check,ChevronRight,Circle}from'lucide-react';
import{cn}from'@/lib/utils';

const DropdownMenu=DropdownMenuPrimitive.Root;
const DropdownMenuTrigger=DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup=DropdownMenuPrimitive.Group;
const DropdownMenuPortal=DropdownMenuPrimitive.Portal;
const DropdownMenuSub=DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup=DropdownMenuPrimitive.RadioGroup;

const menuBaseClasses='z-[150] max-h-[calc(100dvh-2rem)] min-w-[8rem] max-w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden rounded-md border border-slate-800 bg-slate-950 p-1 text-slate-100 shadow-lg overscroll-contain touch-manipulation motion-reduce:animate-none';

const itemBase='relative flex min-h-10 cursor-default select-none items-center rounded-sm px-2.5 py-2 text-sm outline-none text-slate-100 transition-[background-color,color,opacity] duration-150 ease-out hover:bg-slate-800 hover:text-slate-100 focus:bg-slate-800 focus:text-slate-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 motion-reduce:transition-none';

const DropdownMenuSubTrigger=React.forwardRef(({className,inset,children,...props},ref)=>(
 <DropdownMenuPrimitive.SubTrigger ref={ref} className={cn(itemBase,'gap-2',inset&&'pl-8',className)} {...props}>
  {children}
  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 data-[state=open]:rotate-90 motion-reduce:transition-none motion-reduce:transform-none" aria-hidden="true"/>
 </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName=DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent=React.forwardRef(({className,...props},ref)=>(
 <DropdownMenuPrimitive.SubContent ref={ref} className={cn(menuBaseClasses,'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',className)} {...props}/>
));
DropdownMenuSubContent.displayName=DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent=React.forwardRef(({className,sideOffset=4,...props},ref)=>(
 <DropdownMenuPrimitive.Portal>
  <DropdownMenuPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn(menuBaseClasses,'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',className)} {...props}/>
 </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName=DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem=React.forwardRef(({className,inset,...props},ref)=>(
 <DropdownMenuPrimitive.Item ref={ref} className={cn(itemBase,inset&&'pl-8',className)} {...props}/>
));
DropdownMenuItem.displayName=DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem=React.forwardRef(({className,children,checked,...props},ref)=>(
 <DropdownMenuPrimitive.CheckboxItem ref={ref} className={cn(itemBase,'py-2 pl-8 pr-2.5',className)} checked={checked} {...props}>
  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
   <DropdownMenuPrimitive.ItemIndicator>
    <Check className="h-4 w-4 text-slate-100"/>
   </DropdownMenuPrimitive.ItemIndicator>
  </span>
  {children}
 </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName=DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem=React.forwardRef(({className,children,...props},ref)=>(
 <DropdownMenuPrimitive.RadioItem ref={ref} className={cn(itemBase,'py-2 pl-8 pr-2.5',className)} {...props}>
  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
   <DropdownMenuPrimitive.ItemIndicator>
    <Circle className="h-2 w-2 fill-current text-slate-100"/>
   </DropdownMenuPrimitive.ItemIndicator>
  </span>
  {children}
 </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName=DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel=React.forwardRef(({className,inset,...props},ref)=>(
 <DropdownMenuPrimitive.Label ref={ref} className={cn('px-2.5 py-2 text-sm font-semibold text-slate-100',inset&&'pl-8',className)} {...props}/>
));
DropdownMenuLabel.displayName=DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator=React.forwardRef(({className,...props},ref)=>(
 <DropdownMenuPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-slate-800',className)} {...props}/>
));
DropdownMenuSeparator.displayName=DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut=({className,...props})=><span className={cn('ml-auto text-xs tracking-widest text-slate-400 opacity-60',className)} {...props}/>;
DropdownMenuShortcut.displayName='DropdownMenuShortcut';

export{
 DropdownMenu,
 DropdownMenuTrigger,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuCheckboxItem,
 DropdownMenuRadioItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuShortcut,
 DropdownMenuGroup,
 DropdownMenuPortal,
 DropdownMenuSub,
 DropdownMenuSubContent,
 DropdownMenuSubTrigger,
 DropdownMenuRadioGroup
};
