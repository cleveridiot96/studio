
"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MasterItem, MasterItemType } from '@/lib/types';
import { Percent } from 'lucide-react';

const TABS_CONFIG: { value: MasterItemType; label: string; hasCommission: boolean; hasBalance: boolean; }[] = [
  { value: "Customer", label: "Customer", hasCommission: false, hasBalance: true },
  { value: "Supplier", label: "Supplier", hasCommission: false, hasBalance: true },
  { value: "Agent", label: "Agent", hasCommission: true, hasBalance: true },
  { value: "Transporter", label: "Transporter", hasCommission: false, hasBalance: true },
  { value: "Broker", label: "Broker", hasCommission: true, hasBalance: true },
  { value: "Warehouse", label: "Warehouse", hasCommission: false, hasBalance: false },
  { value: "Expense", label: "Expense", hasCommission: false, hasBalance: false },
];

const masterItemSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(["Customer", "Supplier", "Agent", "Transporter", "Broker", "Warehouse", "Expense"]),
  commission: z.coerce.number().optional(),
  openingBalance: z.coerce.number().optional(),
  openingBalanceType: z.enum(['Dr', 'Cr']).optional(),
}).refine(data => {
  const config = TABS_CONFIG.find(t => t.value === data.type);
  if (config?.hasCommission && (data.commission === undefined || data.commission < 0)) {
    return false;
  }
  if (config?.hasCommission && data.commission !== undefined && data.commission === 0) {
    return true;
  }
  return true;
}, {
  message: "Commission must be a non-negative number if applicable.",
  path: ["commission"],
}).refine(data => {
  // If opening balance has a value, its type must also be selected
  if (data.openingBalance !== undefined && data.openingBalance > 0 && !data.openingBalanceType) {
    return false;
  }
  return true;
}, {
  message: "Please select the balance type (To Receive or To Pay).",
  path: ["openingBalanceType"],
});


type MasterItemFormValues = z.infer<typeof masterItemSchema>;

interface MasterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: MasterItem) => void;
  initialData?: MasterItem | null;
  itemTypeFromButton?: MasterItemType;
  fixedIds?: string[];
}

export const MasterForm: React.FC<MasterFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  itemTypeFromButton,
  fixedIds = [],
}) => {
  const form = useForm<MasterItemFormValues>({
    resolver: zodResolver(masterItemSchema),
    defaultValues: {
      name: '',
      type: itemTypeFromButton || 'Customer',
      commission: undefined,
      openingBalance: undefined,
      openingBalanceType: undefined,
    },
  });

  const isEditingFixedItem = initialData && fixedIds.includes(initialData.id);

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
          form.reset({
            name: initialData.name,
            type: initialData.type,
            commission: initialData.commission,
            openingBalance: initialData.openingBalance,
            openingBalanceType: initialData.openingBalanceType,
          });
        } else {
          form.reset({
            name: '',
            type: itemTypeFromButton || 'Customer',
            commission: undefined,
            openingBalance: undefined,
            openingBalanceType: undefined,
          });
        }
    }
  }, [initialData, itemTypeFromButton, form, isOpen]);

  const selectedType = form.watch('type');
  const currentTypeConfig = TABS_CONFIG.find(t => t.value === selectedType);
  const showCommissionField = currentTypeConfig?.hasCommission;
  const showBalanceField = currentTypeConfig?.hasBalance;

  const handleSubmit = (values: MasterItemFormValues) => {
    const itemToSubmit: MasterItem = {
      id: initialData?.id || `${values.type.toLowerCase()}-${Date.now()}`,
      name: values.name,
      type: values.type,
    };
    if (showCommissionField && values.commission !== undefined ) {
      itemToSubmit.commission = values.commission;
    }
    if (showBalanceField && values.openingBalance !== undefined) {
      itemToSubmit.openingBalance = values.openingBalance;
      itemToSubmit.openingBalanceType = values.openingBalance > 0 ? values.openingBalanceType : undefined;
    }
    onSubmit(itemToSubmit);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? `Edit ${initialData.type}` : `Add New Master Item`}</DialogTitle>
          <DialogDescription>
            {initialData ? `Update details for ${initialData.name}.` : 'Fill in the details for the new master item.'}
            {isEditingFixedItem && " (This is a fixed item, only the name can be changed)."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder={`Enter ${selectedType ? selectedType.toLowerCase() : 'item'} name`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                        field.onChange(value as MasterItemType); 
                        const newTypeConfig = TABS_CONFIG.find(t => t.value === value);
                        if (!newTypeConfig?.hasCommission) {
                          form.setValue('commission', undefined);
                        }
                        if (!newTypeConfig?.hasBalance) {
                            form.setValue('openingBalance', undefined);
                            form.setValue('openingBalanceType', undefined);
                        }
                    }}
                    value={field.value}
                    disabled={isEditingFixedItem}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TABS_CONFIG.map(tab => (
                        <SelectItem key={tab.value} value={tab.value} disabled={isEditingFixedItem && tab.value !== initialData?.type}>
                          {tab.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showBalanceField && !isEditingFixedItem && (
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                 <FormField
                    control={form.control}
                    name="openingBalance"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Opening Balance (₹)</FormLabel>
                        <FormControl>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 5000"
                            {...field}
                            value={field.value === undefined ? '' : field.value}
                            onChange={e => {
                                const val = e.target.value;
                                const numValue = val === '' ? undefined : parseFloat(val);
                                field.onChange(numValue);
                            }}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="openingBalanceType"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Balance Type</FormLabel>
                         <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!form.watch('openingBalance') || form.watch('openingBalance') === 0}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Type..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Dr">To Receive (Dr)</SelectItem>
                                <SelectItem value="Cr">To Pay (Cr)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
            )}

            {showCommissionField && !isEditingFixedItem && (
              <FormField
                control={form.control}
                name="commission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Percentage</FormLabel>
                    <div className="relative">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 2.5 for 2.5%"
                        {...field}
                        value={field.value === undefined ? '' : field.value}
                        onChange={e => {
                            const val = e.target.value;
                            const numValue = val === '' ? undefined : parseFloat(val);
                            if (numValue !== undefined && numValue < 0) {
                                field.onChange(0);
                            } else {
                                field.onChange(numValue);
                            }
                        }}
                        className="pr-8"
                      />
                    </FormControl>
                    <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (initialData ? "Saving..." : "Adding...") : (initialData ? "Save Changes" : "Add Item")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
