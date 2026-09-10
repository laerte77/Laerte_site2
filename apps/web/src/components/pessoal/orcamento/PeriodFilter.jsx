import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { startOfWeek, endOfWeek } from 'date-fns';

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear, currentYear + 1];

export default function PeriodFilter({ periodFilter, setPeriodFilter }) {
    
    const updateFilter = (key, value) => {
        setPeriodFilter(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Card className="bg-card border-border mb-6">
            <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={periodFilter.periodType} onValueChange={(v) => updateFilter('periodType', v)}>
                        <SelectTrigger className="w-[150px] bg-input"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent className="dark-pessoal bg-card">
                            <SelectItem value="mes">Mês</SelectItem>
                            <SelectItem value="quinzena">Quinzena</SelectItem>
                            <SelectItem value="semana">Semana</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                {(periodFilter.periodType === 'mes' || periodFilter.periodType === 'quinzena') && (
                    <div className="space-y-2">
                        <Label>Mês</Label>
                        <Select value={String(periodFilter.month)} onValueChange={(v) => updateFilter('month', Number(v))}>
                            <SelectTrigger className="w-[140px] bg-input"><SelectValue /></SelectTrigger>
                            <SelectContent className="dark-pessoal bg-card">
                                {meses.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
                {(periodFilter.periodType === 'mes' || periodFilter.periodType === 'quinzena') && (
                    <div className="space-y-2">
                        <Label>Ano</Label>
                        <Select value={String(periodFilter.year)} onValueChange={(v) => updateFilter('year', Number(v))}>
                            <SelectTrigger className="w-[120px] bg-input"><SelectValue /></SelectTrigger>
                            <SelectContent className="dark-pessoal bg-card">
                                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {periodFilter.periodType === 'quinzena' && (
                    <div className="space-y-2">
                        <Label>Quinzena</Label>
                        <Select value={String(periodFilter.quinzena)} onValueChange={(v) => updateFilter('quinzena', Number(v))}>
                            <SelectTrigger className="w-[140px] bg-input"><SelectValue /></SelectTrigger>
                            <SelectContent className="dark-pessoal bg-card">
                                <SelectItem value="1">1ª Quinzena</SelectItem>
                                <SelectItem value="2">2ª Quinzena</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
                {periodFilter.periodType === 'semana' && (
                    <div className="space-y-2 flex flex-col text-sm text-muted-foreground pt-3">
                        {/* Simplified week selection for MVP, ideally use a date picker here */}
                        <span>Semana Atual Selecionada ({startOfWeek(new Date()).toLocaleDateString()} a {endOfWeek(new Date()).toLocaleDateString()})</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}