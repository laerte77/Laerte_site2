import*as React from'react';
import{cn}from'@/lib/utils';

const Textarea=React.forwardRef(({className,...props},ref)=>(
 <textarea
  ref={ref}
  className={cn(
   'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground',
   'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
   'disabled:cursor-not-allowed disabled:opacity-50',
   'transition-[background-color,border-color,color,box-shadow,opacity] duration-200 ease-out',
   'max-md:min-h-[100px] max-md:p-3 max-md:text-[16px]',
   'touch-target motion-reduce:transition-none',
   className
  )}
  {...props}
 />
));

Textarea.displayName='Textarea';

export{Textarea};
