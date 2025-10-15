"use client";

import React from 'react';
import { useInventory } from '@/hooks/useInventory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Warehouse } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export const WarehouseSummary = () => {
    const { allAggregatedInventory, isLoading } = useInventory();

    const warehouseSummary = React.useMemo(() => {
        if (isLoading || !allAggregatedInventory) return [];

        const summary = new Map<string, { id: string; name: string; bags: number }>();

        allAggregatedInventory.forEach(item => {
            if (item.currentBags > 0) {
                const existing = summary.get(item.locationId) || { id: item.locationId, name: item.locationName, bags: 0 };
                existing.bags += item.currentBags;
                summary.set(item.locationId, existing);
            }
        });

        return Array.from(summary.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [allAggregatedInventory, isLoading]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Warehouse Stock</CardTitle>
                    <CardDescription>Current bag totals by location.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 border rounded-lg space-y-2">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }
    
    if(warehouseSummary.length === 0) {
        return null; // Don't render anything if there's no stock to show
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Warehouse Stock</CardTitle>
                <CardDescription>Current bag totals by location. Click a warehouse to view its detailed inventory.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {warehouseSummary.map(wh => (
                        <Link key={wh.id} href={`/inventory?warehouseId=${wh.id}`} className="block group">
                            <div className="p-4 border rounded-lg h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:border-primary">
                                <h3 className="font-semibold text-primary flex items-center gap-2">
                                    <Warehouse className="h-5 w-5" />
                                    {wh.name}
                                </h3>
                                <p className="text-2xl font-bold mt-2">{Math.round(wh.bags).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">BAGS</span></p>
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
