import { cn } from '@/lib/utils';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import React from 'react';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef(
  ({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        [
          'fixed',
          'top-0',
          'z-[100]',
          'flex',
          'max-h-screen',
          'w-full',
          'flex-col-reverse',
          'gap-2',
          'p-4',

          'sm:bottom-0',
          'sm:right-0',
          'sm:top-auto',
          'sm:flex-col',

          'md:max-w-[420px]',

          'pointer-events-none'
        ].join(' '),
        className
      )}
      {...props}
    />
  )
);

ToastViewport.displayName =
  ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  [
    'group',
    'relative',
    'pointer-events-auto',
    'flex',
    'w-full',
    'items-center',
    'justify-between',
    'gap-4',
    'overflow-hidden',
    'rounded-xl',
    'border',
    'p-4',
    'pr-12',
    'shadow-lg',

    'transition-[background-color,border-color,color,box-shadow,opacity,transform]',
    'duration-200',
    'ease-out',

    'data-[swipe=move]:transition-none',
    'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
    'data-[swipe=cancel]:translate-x-0',
    'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',

    'data-[state=open]:animate-in',
    'data-[state=closed]:animate-out',

    'data-[state=closed]:fade-out-80',
    'data-[state=open]:slide-in-from-top-full',
    'data-[state=open]:sm:slide-in-from-bottom-full',
    'data-[state=closed]:slide-out-to-right-full',

    'motion-reduce:transition-none',
    'motion-reduce:animate-none'
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-background border-border text-foreground',

        destructive:
          'group destructive border-destructive bg-destructive text-destructive-foreground'
      }
    },

    defaultVariants: {
      variant: 'default'
    }
  }
);

const Toast = React.forwardRef(
  (
    {
      className,
      variant,
      ...props
    },
    ref
  ) => {
    return (
      <ToastPrimitives.Root
        ref={ref}
        className={cn(
          toastVariants({ variant }),
          className
        )}
        {...props}
      />
    );
  }
);

Toast.displayName =
  ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef(
  (
    {
      className,
      ...props
    },
    ref
  ) => (
    <ToastPrimitives.Action
      ref={ref}
      className={cn(
        [
          'inline-flex',
          'h-9',
          'shrink-0',
          'items-center',
          'justify-center',
          'rounded-md',
          'border',
          'bg-transparent',
          'px-3',
          'text-sm',
          'font-medium',
          'ring-offset-background',

          'transition-[background-color,border-color,color,opacity]',
          'duration-200',

          'hover:bg-secondary',

          'focus-visible:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-ring',
          'focus-visible:ring-offset-2',

          'disabled:pointer-events-none',
          'disabled:opacity-50',

          'group-[.destructive]:border-destructive/30',
          'group-[.destructive]:hover:border-destructive/30',
          'group-[.destructive]:hover:bg-destructive',
          'group-[.destructive]:hover:text-destructive-foreground',
          'group-[.destructive]:focus-visible:ring-destructive',

          'motion-reduce:transition-none'
        ].join(' '),
        className
      )}
      {...props}
    />
  )
);

ToastAction.displayName =
  ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef(
  (
    {
      className,
      ...props
    },
    ref
  ) => (
    <ToastPrimitives.Close
      ref={ref}
      className={cn(
        [
          'absolute',
          'right-2',
          'top-2',

          'inline-flex',
          'h-9',
          'w-9',
          'items-center',
          'justify-center',
          'rounded-full',

          'text-foreground/50',
          'opacity-70',

          'transition-[background-color,color,opacity]',
          'duration-200',

          'hover:bg-foreground/5',
          'hover:text-foreground',
          'hover:opacity-100',

          'focus-visible:opacity-100',
          'focus-visible:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-ring',
          'focus-visible:ring-offset-2',

          'group-[.destructive]:text-red-300',
          'group-[.destructive]:hover:bg-red-500/10',
          'group-[.destructive]:hover:text-red-50',
          'group-[.destructive]:focus-visible:ring-red-400',
          'group-[.destructive]:focus-visible:ring-offset-red-600',

          'motion-reduce:transition-none'
        ].join(' '),
        className
      )}
      toast-close=""
      aria-label="Fechar notificação"
      {...props}
    >
      <X
        className="h-4 w-4"
        aria-hidden="true"
      />

      <span className="sr-only">
        Fechar notificação
      </span>
    </ToastPrimitives.Close>
  )
);

ToastClose.displayName =
  ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef(
  (
    {
      className,
      ...props
    },
    ref
  ) => (
    <ToastPrimitives.Title
      ref={ref}
      className={cn(
        'text-sm font-semibold',
        className
      )}
      {...props}
    />
  )
);

ToastTitle.displayName =
  ToastPrimitives.Title.displayName;

const ToastDescription =
  React.forwardRef(
    (
      {
        className,
        ...props
      },
      ref
    ) => (
      <ToastPrimitives.Description
        ref={ref}
        className={cn(
          'text-sm leading-relaxed opacity-90',
          className
        )}
        {...props}
      />
    )
  );

ToastDescription.displayName =
  ToastPrimitives.Description.displayName;

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport
};
