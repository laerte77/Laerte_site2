import*as React from'react';
import{OTPInput,OTPInputContext}from'input-otp';
import{Minus}from'lucide-react';
import{cn}from'@/lib/utils';

const InputOTP=React.forwardRef(({className,containerClassName,...props},ref)=>(
 <OTPInput
  ref={ref}
  containerClassName={cn('flex items-center gap-2 has-[:disabled]:opacity-50',containerClassName)}
  className={cn('disabled:cursor-not-allowed touch-action-manipulation',className)}
  {...props}
 />
));

InputOTP.displayName='InputOTP';

const InputOTPGroup=React.forwardRef(({className,...props},ref)=>(
 <div ref={ref} className={cn('flex items-center',className)} {...props}/>
));

InputOTPGroup.displayName='InputOTPGroup';

const InputOTPSlot=React.forwardRef(({index,className,...props},ref)=>{
 const context=React.useContext(OTPInputContext);
 const{char,hasFakeCaret,isActive}=context.slots[index];

 return <div
  ref={ref}
  className={cn(
   'relative flex h-11 w-11 items-center justify-center border-y border-r border-input text-base shadow-sm transition-[background-color,border-color,color,box-shadow,opacity] duration-200 ease-out first:rounded-l-md first:border-l last:rounded-r-md max-md:h-12 max-md:w-12 max-md:text-[16px] motion-reduce:transition-none',
   isActive&&'z-10 bg-background ring-2 ring-ring ring-offset-1',
   className
  )}
  {...props}
 >
  {char}

  {hasFakeCaret&&<div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
   <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000 motion-reduce:animate-none"/>
  </div>}
 </div>;
});

InputOTPSlot.displayName='InputOTPSlot';

const InputOTPSeparator=React.forwardRef((props,ref)=>(
 <div ref={ref} role="separator" aria-hidden="true" {...props}>
  <Minus className="h-4 w-4" aria-hidden="true"/>
 </div>
));

InputOTPSeparator.displayName='InputOTPSeparator';

export{InputOTP,InputOTPGroup,InputOTPSlot,InputOTPSeparator};
