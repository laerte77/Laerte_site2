import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import React from 'react';

const buttonVariants = cva(
	'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 glow-neon-hover max-md:min-h-[44px] max-md:text-base max-md:px-5 touch-action-manipulation',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_hsl(var(--ring)/0.5)]',
				destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_10px_hsl(var(--destructive)/0.5)]',
				outline: 'border border-primary/40 bg-card/50 hover:bg-accent/10 hover:text-accent hover:border-accent hover:shadow-[0_0_10px_hsl(var(--accent)/0.3)]',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-accent/10 hover:text-accent hover:shadow-[0_0_10px_hsl(var(--accent)/0.2)]',
				link: 'text-primary underline-offset-4 hover:underline hover:text-shadow-[0_0_8px_hsl(var(--primary)/0.5)]',
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 rounded-md px-3',
				lg: 'h-11 rounded-lg px-8',
				icon: 'h-10 w-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : 'button';
	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			ref={ref}
			{...props}
		/>
	);
});
Button.displayName = 'Button';

export { Button, buttonVariants };