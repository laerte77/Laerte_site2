import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

export default function SaldoCard({ entradasPrev, despesasPrev, entradasReais, despesasReais }) {
    const saldoPrev = entradasPrev - despesasPrev;
    const saldoReal = entradasReais - despesasReais;

    return (
        <Card className="bg-card border-border lg:col-span-2">
            <CardHeader className="pb-2 border-b border-border/50">
                <CardTitle className="text-lg">Resumo de Saldo</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-border/50">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                    <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Saldo Previsto</span>
                    <span className={`text-4xl font-black ${saldoPrev >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {formatCurrency(saldoPrev)}
                    </span>
                </div>
                
                <div className="flex flex-col items-center justify-center text-center space-y-2 pt-6 md:pt-0">
                    <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Saldo Real</span>
                    <span className={`text-4xl font-black ${saldoReal >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {formatCurrency(saldoReal)}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}