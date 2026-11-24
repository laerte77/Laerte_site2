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
        className="
          !fixed !left-1/2 !top-1/2
          !grid !w-[min(680px,calc(100vw-32px))]
          !max-w-[680px] !-translate-x-1/2 !-translate-y-1/2
          !gap-0 !overflow-hidden !rounded-2xl
          !border !border-[hsl(var(--neon-comercial)/.35)]
          !bg-[#111820] !p-0 !text-white
          shadow-[0_25px_90px_rgba(0,0,0,.65)]
          max-sm:!max-h-[calc(100dvh-24px)]
          sm:!max-w-[680px]
        "
        style={{
          boxShadow: '0 25px 90px rgba(0,0,0,.65), 0 0 28px hsl(var(--neon-comercial)/.12)'
        }}
      >
        {/* FAIXA VERDE */}
        <div className="h-1 w-full" style={{ background: GREEN }} />

        {/* CABEÇALHO */}
        <DialogHeader className="border-b border-[hsl(var(--neon-comercial)/.15)] bg-[hsl(var(--neon-comercial)/.035)] px-7 pb-6 pt-7 text-left sm:px-8">
          <div className="flex items-start gap-4">
            {Icon && (
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
                style={{
                  background: 'hsl(var(--neon-comercial)/.12)',
                  borderColor: 'hsl(var(--neon-comercial)/.45)',
                  boxShadow: '0 0 18px hsl(var(--neon-comercial)/.10)'
                }}
              >
                <Icon className="h-5 w-5" style={{ color: GREEN }} />
              </div>
            )}

            <div className="min-w-0 flex-1 pr-8">
              <DialogTitle className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {title}
              </DialogTitle>

              {description && (
                <DialogDescription className="mt-2 text-sm leading-6 text-gray-400">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* CAMPOS */}
        <div className="max-h-[65dvh] overflow-y-auto bg-[#111820] px-7 py-7 sm:px-8">
          <div
            className="
              space-y-5
              [&_label]:text-gray-200
              [&_input]:border-[hsl(var(--neon-comercial)/.22)]
              [&_input]:bg-[#0b1117]
              [&_input]:text-white
              [&_input]:placeholder:text-gray-500
              [&_input]:focus-visible:border-[hsl(var(--neon-comercial))]
              [&_input]:focus-visible:ring-[hsl(var(--neon-comercial)/.25)]
              [&_textarea]:border-[hsl(var(--neon-comercial)/.22)]
              [&_textarea]:bg-[#0b1117]
              [&_textarea]:text-white
              [&_textarea]:placeholder:text-gray-500
              [&_textarea]:focus-visible:border-[hsl(var(--neon-comercial))]
              [&_textarea]:focus-visible:ring-[hsl(var(--neon-comercial)/.25)]
            "
          >
            {children}
          </div>
        </div>

        {/* RODAPÉ */}
        {footer && (
          <DialogFooter className="flex flex-col-reverse gap-3 border-t border-[hsl(var(--neon-comercial)/.18)] bg-[#0d141b] px-7 py-5 sm:flex-row sm:justify-end sm:px-8">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
