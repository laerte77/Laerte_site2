
import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

const GREEN = 'hsl(var(--neon-comercial))';

export default function ModalComercialPadrao({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  children,
  footer
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) onClose?.();
      }}
    >
      <DialogContent
        onInteractOutside={event => event.preventDefault()}
        className="w-[calc(100%-2rem)] max-w-[620px] overflow-hidden rounded-[14px] border border-[hsl(var(--neon-comercial)/.35)] bg-card p-0 text-foreground shadow-[0_30px_100px_rgba(0,0,0,.65)]"
        style={{
          boxShadow: '0 30px 100px rgba(0,0,0,.65), 0 0 30px hsl(var(--neon-comercial)/.10)'
        }}
      >

        {/* FAIXA SUPERIOR */}
        <div
          className="h-[3px] w-full"
          style={{ background: GREEN }}
        />

        {/* CABEÇALHO */}
        <DialogHeader
          className="px-6 pb-5 pt-7 sm:px-7"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--neon-comercial)/.08), transparent)'
          }}
        >
          <div className="flex items-start gap-4">

            {Icon && (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                style={{
                  background: 'hsl(var(--neon-comercial)/.08)',
                  borderColor: 'hsl(var(--neon-comercial)/.30)',
                  boxShadow: '0 0 20px hsl(var(--neon-comercial)/.12)'
                }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: GREEN }}
                />
              </div>
            )}

            <div className="min-w-0 flex-1 pr-7">
              <DialogTitle className="text-left text-[22px] font-bold tracking-tight">
                {title}
              </DialogTitle>

              {description && (
                <DialogDescription className="mt-1.5 text-left text-sm leading-6 text-muted-foreground">
                  {description}
                </DialogDescription>
              )}
            </div>

          </div>
        </DialogHeader>

        {/* CAMPOS */}
        <div className="px-6 py-6 sm:px-7">
          <div className="space-y-5">
            {children}
          </div>
        </div>

        {/* RODAPÉ */}
        {footer && (
          <DialogFooter
            className="flex flex-col-reverse gap-3 border-t px-6 py-5 sm:flex-row sm:justify-end sm:px-7"
            style={{
              borderColor: 'hsl(var(--border)/.75)',
              background: 'hsl(var(--background)/.18)'
            }}
          >
            {footer}
          </DialogFooter>
        )}

      </DialogContent>
    </Dialog>
  );
}
