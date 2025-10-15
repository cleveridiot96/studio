"use client";

import React from 'react';
import { useInventory } from '@/hooks/useInventory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Warehouse, Layers3 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

const WAREHOUSE_COLORS = [
    { background: 'linear-gradient(to right top, #1e3a8a, #1e4b9f, #1c5db4, #1b70c9, #1c82de)', color: 'white' },
    { background: 'linear-gradient(to right top, #064e3b, #0d634a, #13795a, #1a9069, #22a779)', color: 'white' },
    { background: 'linear-gradient(to right top, #7f1d1d, #952c28, #ac3a33, #c3493e, #da584a)', color: 'white' },
    { background: 'linear-gradient(to right top, #4a044e, #68126e, #881e8f, #aa2cb2, #cd3ad6)', color: 'white' },
    { background: 'linear-gradient(to right top, #ca8a04, #d19400, #d89f00, #dea900, #e5b400)', color: 'black' },
    { background: 'linear-gradient(to right top, #0891b2, #00a2c1, #00b3cf, #00c5dc, #00d7e8)', color: 'black' },
];


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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {warehouseSummary.map((wh, index) => {
                       const style = WAREHOUSE_COLORS[index % WAREHOUSE_COLORS.length];
                       return (
                        <Link key={wh.id} href={`/inventory?warehouseId=${wh.id}`} className="block group">
                            <motion.div
                              whileTap={{ scale: 0.95 }}
                              transition={{ type: "spring", stiffness: 400, damping: 15 }}
                              className="h-full w-full"
                            >
                                <Card
                                  className="shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform group-hover:scale-105 rounded-xl p-3 flex flex-col items-center text-center justify-center h-full min-h-[120px]"
                                  style={{ background: style.background, color: style.color }}
                                >
                                    <Layers3 className="h-7 w-7 mb-2" />
                                    <p className="text-base font-semibold mb-1 uppercase">{wh.name}</p>
                                    <p className="text-2xl font-bold">{Math.round(wh.bags).toLocaleString()} <span className="text-sm font-normal opacity-80">BAGS</span></p>
                                </Card>
                            </motion.div>
                        </Link>
                       )
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
