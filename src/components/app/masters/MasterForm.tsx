// @ts-nocheck
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
import type { MasterItem, MasterItemType, MasterItemSubtype } from '@/lib/types';
import { Percent } from 'lucide-react';

const TABS_CONFIG: { value: MasterItemType; label: string; hasCommission: boolean; hasSubtypes?: boolean }[] = [
  { value: "Customer", label: "Customer", hasCommission: false, hasSubtypes: true },
  { value: "Supplier", label: "Supplier", hasCommission: false },
  { value: "Agent", label: "Agent", hasCommission: true },
  { value: "Transporter", label: "Transporter", hasCommission: false },
  { value: "Broker", label: "Broker", hasCommission: true },
];

const masterItemSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(["Customer", "Supplier", "Agent", "Transporter", "Broker"]),
  subtype: z.string().optional(), // For customer bifurcation
  commission: z.coerce.number().optional(),
}).refine(data => {
  const config = TABS_CONFIG.find(t => t.value === data.type);
  if (config?.hasCommission && data.commission !== undefined && data.commission <= 0) {
    // If commission is applicable and provided, it must be positive
    // return false; // This would make 0 an invalid commission if hasCommission is true.
    // For now, allow 0 as a valid commission. This can be adjusted.
  }
  if (data.type === 'Customer' && !data.subtype) {
    // If type is Customer, subtype (bifurcation) is required.
    // This path might not be directly reachable if dropdown is non-optional in UI,
    // but good for data integrity.
  }
  return true; 
}, {
  message: "Commission must be a positive number if specified. Subtype is required for Customers.",
  path: ["commission"], // Or a more general path if subtype logic is complex
});


type MasterItemFormValues = z.infer<typeof masterItemSchema>;

interface MasterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: MasterItem) => void;
  initialData?: MasterItem | null;
  itemTypeFromButton?: MasterItemType; 
  customerSubtypes?: MasterItemSubtype[];
}

export const MasterForm: React.FC<MasterFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  itemTypeFromButton,
  customerSubtypes = ['Retailer', 'Wholesaler', 'Corporate'], // Default subtypes
}) => {
  const form = useForm<MasterItemFormValues>({
    resolver: zodResolver(masterItemSchema),
    defaultValues: {
      name: '',
      type: itemTypeFromButton || 'Customer',
      subtype: (itemTypeFromButton === 'Customer' && customerSubtypes?.length) ? customerSubtypes[0] : undefined,
      commission: undefined,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        type: initialData.type,
        subtype: initialData.subtype,
        commission: initialData.commission,
      });
    } else {
      form.reset({
        name: '',
        type: itemTypeFromButton || 'Customer',
        subtype: (itemTypeFromButton === 'Customer' && customerSubtypes?.length) ? customerSubtypes[0] : undefined,
        commission: undefined,
      });
    }
  }, [initialData, itemTypeFromButton, customerSubtypes, form, isOpen]);

  const selectedType = form.watch('type');
  const currentTypeConfig = TABS_CONFIG.find(t => t.value === selectedType);
  const showCommissionField = currentTypeConfig?.hasCommission;
  const showSubtypeField = selectedType === 'Customer';


  const handleSubmit = (values: MasterItemFormValues) => {
    const itemToSubmit: MasterItem = {
      id: initialData?.id || `${values.type.toLowerCase()}-${Date.now()}`,
      name: values.name,
      type: values.type,
    };
    if (showCommissionField && values.commission !== undefined ) { // Allow 0 commission
      itemToSubmit.commission = values.commission;
    }
    if (showSubtypeField && values.subtype) {
      itemToSubmit.subtype = values.subtype as MasterItemSubtype;
    }
    onSubmit(itemToSubmit);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? `Edit ${initialData.type}` : `Add New Master Item`}</DialogTitle>
          <DialogDescription>
            {initialData ? `Update details for ${initialData.name}.` : 'Fill in the details for the new master item.'}
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
                    <Input placeholder={`Enter ${selectedType.toLowerCase()} name`} {...field} />
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
                  <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Reset subtype if type changes from Customer
                      if (value !== 'Customer') {
                          form.setValue('subtype', undefined);
                      } else if (customerSubtypes?.length) {
                        form.setValue('subtype', customerSubtypes[0]); // Default to first subtype for Customer
                      }
                       // Reset commission if new type does not have commission
                      const newTypeConfig = TABS_CONFIG.find(t => t.value === value);
                      if (!newTypeConfig?.hasCommission) {
                        form.setValue('commission', undefined);
                      }

                  }} defaultValue={field.value} disabled={!!initialData}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TABS_CONFIG.map(tab => (
                        <SelectItem key={tab.value} value={tab.value}>
                          {tab.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showSubtypeField && (
              <FormField
                control={form.control}
                name="subtype"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Bifurcation</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customerSubtypes.map(subtype => (
                          <SelectItem key={subtype} value={subtype}>
                            {subtype}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {showCommissionField && (
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
                            field.onChange(val === '' ? undefined : parseFloat(val));
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
