import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef(
  ({ className, ...props }, ref) => (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn(
        'border-b-0',
        className
      )}
      {...props}
    />
  )
);

AccordionItem.displayName =
  'AccordionItem';

const AccordionTrigger = React.forwardRef(
  (
    {
      className,
      children,
      ...props
    },
    ref
  ) => (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        className={cn(
          [
            'flex',
            'flex-1',
            'items-center',
            'justify-between',
            'font-medium',

            'transition-[color,background-color,opacity]',
            'duration-200',
            'ease-out',

            '[&[data-state=open]>svg]:rotate-180',

            'focus-visible:outline-none',
            'focus-visible:ring-2',
            'focus-visible:ring-ring',
            'focus-visible:ring-offset-2',

            'motion-reduce:transition-none'
          ].join(' '),
          className
        )}
        {...props}
      >
        {children}

        <ChevronDown
          className="
            h-4
            w-4
            shrink-0
            transition-transform
            duration-200
            ease-out
            motion-reduce:transition-none
            motion-reduce:transform-none
          "
          aria-hidden="true"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
);

AccordionTrigger.displayName =
  AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef(
  (
    {
      className,
      children,
      ...props
    },
    ref
  ) => (
    <AccordionPrimitive.Content
      ref={ref}
      className={cn(
        [
          'overflow-hidden',
          'text-sm',

          'data-[state=closed]:animate-accordion-up',
          'data-[state=open]:animate-accordion-down',

          'motion-reduce:animate-none'
        ].join(' '),
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'pb-0 pt-0'
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
);

AccordionContent.displayName =
  AccordionPrimitive.Content.displayName;

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
};
