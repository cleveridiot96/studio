
"use client";

import * as React from "react";
import { useForm, FormProvider, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { paymentSchema, type PaymentFormValues } from "@/lib/schemas/paymentSchema";
import type { MasterItem, Payment, MasterItemType, Purchase } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { MasterForm } from "@/components/app/masters/MasterForm";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";

interface AddPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payment: Payment) => void;
  parties: MasterItem[];
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  allPurchases: Purchase[];
  allPayments: Payment[];
  paymentToEdit?: Payment | null;
}

export const AddPaymentForm: React.FC<AddPaymentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  parties,
  onMasterDataUpdate,
  allPurchases,
  allPayments,
  paymentToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<MasterItemType | null>(null);
  const [masterItemToEdit, setMasterItemToEdit] = React.useState<MasterItem | null>(null);
  const [isBillPopoverOpen, setIsBillPopoverOpen] = React.useState(false);

  const getDefaultValues = React.useCallback((): PaymentFormValues => {
    if (paymentToEdit) {
      return {
        date: new Date(paymentToEdit.date),
        partyId: paymentToEdit.partyId,
        amount: paymentToEdit.amount,
        paymentMethod: paymentToEdit.paymentMethod,
        transactionType: paymentToEdit.transactionType || 'On Account',
        source: paymentToEdit.source || "",
        notes: paymentToEdit.notes || "",
        againstBills: paymentToEdit.againstBills || [],
      };
    }
    return {
      date: new Date(),
      partyId: undefined, 
      amount: undefined,
      paymentMethod: 'Cash',
      transactionType: 'On Account',
      source: "",
      notes: "",
      againstBills: [],
    };
  }, [paymentToEdit]);

  const methods = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema(parties)),
    defaultValues: getDefaultValues(),
  });
  const { control, handleSubmit, reset, getValues, setValue, watch, formState: { errors } } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "againstBills" });

  const watchedPartyId = watch('partyId');
  const watchedAmount = watch('amount');
  const watchedTransactionType = watch('transactionType');
  const watchedAllocatedBills = watch('againstBills');

  const pendingBills = React.useMemo(() => {
    if (!watchedPartyId) return [];
    
    const partyPurchases = allPurchases.filter(p => p.supplierId === watchedPartyId || p.agentId === watchedPartyId);

    const paymentsForParty = allPayments.filter(p => p.partyId === watchedPartyId && p.id !== paymentToEdit?.id);
    const allocatedAmounts = new Map<string, number>();
    paymentsForParty.forEach(p => {
        p.againstBills?.forEach(ab => {
            allocatedAmounts.set(ab.billId, (allocatedAmounts.get(ab.billId) || 0) + ab.amount);
        });
    });

    return partyPurchases.map(p => {
        const paid = allocatedAmounts.get(p.id) || 0;
        const due = p.totalAmount - paid;
        return { ...p, due };
    }).filter(p => p.due > 0.01);
  }, [watchedPartyId, allPurchases, allPayments, paymentToEdit]);

  const totalAllocated = React.useMemo(() => {
    return (watchedAllocatedBills || []).reduce((sum, bill) => sum + (bill.amount || 0), 0);
  }, [watchedAllocatedBills]);

  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
    }
  }, [isOpen, reset, getDefaultValues]);

  const handleOpenMasterForm = (type: MasterItemType = "Supplier") => {
    setMasterItemToEdit(null);
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };
  
  const handleEditMasterItem = (id: string) => {
    const itemToEdit = parties.find(p => p.id === id) || null;
    if (itemToEdit) {
      setMasterItemToEdit(itemToEdit);
      setMasterFormItemType(itemToEdit.type);
      setIsMasterFormOpen(true);
    }
  }

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem);
    setIsMasterFormOpen(false);
    setMasterItemToEdit(null);
    methods.setValue('partyId', newItem.id, { shouldValidate: true });
    toast({ title: `${newItem.type} "${newItem.name}" added/updated successfully.` });
  };
  
  const processSubmit = (values: PaymentFormValues) => {
    if (!values.partyId || !values.amount || values.amount <= 0) {
        toast({ title: "Missing Info", description: "Please select a party and enter a valid amount.", variant: "destructive" });
        setIsSubmitting(false); 
        return;
    }
    setIsSubmitting(true);
    const selectedParty = parties.find(p => p.id === values.partyId);
    if (!selectedParty) {
      toast({ title: "Error", description: "Selected party not found.", variant: "destructive"});
      setIsSubmitting(false);
      return;
    }

    const paymentData: Payment = {
      id: paymentToEdit?.id || `payment-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      partyId: values.partyId as string,
      partyName: selectedParty.name,
      partyType: selectedParty.type as MasterItemType,
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      transactionType: values.transactionType,
      againstBills: values.transactionType === 'Against Bill' ? values.againstBills : [],
      source: values.source,
      notes: values.notes,
    };
    onSubmit(paymentData);
    setIsSubmitting(false);
    onClose();
  };

  const addBillToAllocate = (bill: Purchase & { due: number }) => {
    append({
        billId: bill.id,
        amount: 0,
        billDate: bill.date,
        billTotal: bill.totalAmount,
        billVakkal: bill.items.map(i => i.lotNumber).join(', ')
    });
  };

  const autoAllocate = () => {
    const totalPayableAmount = getValues('amount') || 0;
    if (totalPayableAmount <= 0) {
        toast({ title: "Enter Amount", description: "Please enter a payment amount before auto-allocating." });
        return;
    }
    
    const sortedBills = pendingBills
        .filter(bill => !watchedAllocatedBills?.some(ab => ab.billId === bill.id))
        .sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    let remainingAmountToAllocate = totalPayableAmount - totalAllocated;
    
    const newAllocations = [...(watchedAllocatedBills || [])];
    
    for (const bill of sortedBills) {
        if (remainingAmountToAllocate <= 0) break;
        const amountToAllocate = Math.min(bill.due, remainingAmountToAllocate);
        newAllocations.push({
            billId: bill.id,
            amount: parseFloat(amountToAllocate.toFixed(2)),
            billDate: bill.date,
            billTotal: bill.totalAmount,
            billVakkal: bill.items.map(i => i.lotNumber).join(', ')
        });
        remainingAmountToAllocate -= amountToAllocate;
    }

    setValue('againstBills', newAllocations, { shouldValidate: true });
    toast({ title: "Auto-allocated", description: `Payment allocated to oldest bills first.` });
  };


  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{paymentToEdit ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
            <DialogDescription>
              Enter the details for the payment. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}>
              <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={control} name="date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Date</FormLabel>
                      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd/MM/yy") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsDatePickerOpen(false); }} disabled={(date) => date > new Date()} initialFocus />
                        </PopoverContent>
                      </Popover><FormMessage />
                    </FormItem>)}
                  />
                  <FormField control={control} name="partyId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party</FormLabel>
                       <MasterDataCombobox value={field.value} onChange={field.onChange}
                        options={parties.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))}
                        placeholder="Select Party" searchPlaceholder="Search parties..." notFoundMessage="No party found." 
                        addNewLabel="Add New Party"
                        onAddNew={() => {
                            const currentPartyValue = getValues("partyId");
                            const currentParty = parties.find(p => p.id === currentPartyValue);
                            handleOpenMasterForm(currentParty?.type || 'Supplier');
                        }}
                        onEdit={handleEditMasterItem}
                      /> <FormMessage />
                    </FormItem>)}
                  />
                   <FormField control={control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="Enter amount" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                      <FormMessage />
                    </FormItem>)}
                  />
                   <FormField control={control} name="paymentMethod" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <ShadSelect onValueChange={field.onChange} value={field.value || 'Cash'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank">Bank</SelectItem><SelectItem value="UPI">UPI</SelectItem>
                        </SelectContent>
                      </ShadSelect><FormMessage />
                    </FormItem>)}
                  />
                  <FormField control={control} name="transactionType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Type</FormLabel>
                      <ShadSelect onValueChange={field.onChange} value={field.value || 'On Account'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="On Account">On Account</SelectItem><SelectItem value="Against Bill">Against Bill</SelectItem>
                        </SelectContent>
                      </ShadSelect><FormMessage />
                    </FormItem>)}
                  />
                  <FormField control={control} name="source" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., Self, Bank Deposit" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>)}
                  />
                </div>

                {watchedTransactionType === 'Against Bill' && (
                  <Card className="mt-4 p-4 space-y-4">
                    <CardHeader className="p-0 mb-2"><CardTitle className="text-md">Bill Allocation</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="space-y-2">
                        {fields.map((item, index) => (
                          <div key={item.id} className="flex items-center gap-2 p-2 border rounded-md">
                            <div className="flex-grow">
                                <p className="font-semibold">{item.billVakkal}</p>
                                <p className="text-xs text-muted-foreground">Due: ₹{pendingBills.find(b=>b.id === item.billId)?.due.toLocaleString('en-IN') || item.billTotal?.toLocaleString('en-IN')} | Date: {item.billDate ? format(parseISO(item.billDate), 'dd/MM/yy') : ''}</p>
                            </div>
                            <Controller control={control} name={`againstBills.${index}.amount`}
                                render={({ field }) => (
                                    <Input type="number" step="0.01" className="w-32" placeholder="Allocate" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                )}
                            />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                         <Popover open={isBillPopoverOpen} onOpenChange={setIsBillPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="outline" size="sm" disabled={!watchedPartyId}><PlusCircle className="mr-2 h-4 w-4"/>Add Bill</Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search bills..."/>
                                    <CommandList className="max-h-48">
                                        <CommandEmpty>No pending bills found.</CommandEmpty>
                                        {pendingBills.filter(pb => !fields.some(f => f.billId === pb.id)).map(bill => (
                                            <CommandItem key={bill.id} onSelect={() => { addBillToAllocate(bill); setIsBillPopoverOpen(false); }}>
                                                <div className="flex justify-between w-full">
                                                    <span>{bill.items.map(i=>i.lotNumber).join(', ')} ({format(parseISO(bill.date), 'dd/MM/yy')})</span>
                                                    <span className="font-semibold">₹{bill.due.toLocaleString('en-IN')}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Button type="button" variant="secondary" size="sm" onClick={autoAllocate} disabled={!watchedAmount || !pendingBills.length}>Auto-Allocate</Button>
                      </div>

                      <div className="text-right text-sm font-semibold mt-4">
                        <p>Total Allocated: ₹{totalAllocated.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                        <p className={totalAllocated > (watchedAmount || 0) ? "text-destructive" : "text-muted-foreground"}>
                            Remaining: ₹{((watchedAmount || 0) - totalAllocated).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}


                <FormField control={control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Add any notes for this payment..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>)}
                />

                <DialogFooter className="pt-4">
                  <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (paymentToEdit ? "Saving..." : "Adding...") : (paymentToEdit ? "Save Changes" : "Add Payment")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {isMasterFormOpen && (
        <MasterForm
          isOpen={isMasterFormOpen}
          onClose={() => { setIsMasterFormOpen(false); setMasterItemToEdit(null); }}
          onSubmit={handleMasterFormSubmit}
          initialData={masterItemToEdit}
          itemTypeFromButton={masterFormItemType!}
        />
      )}
    </>
  );
};
