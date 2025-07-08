
"use client";

import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { receiptSchema, type ReceiptFormValues } from "@/lib/schemas/receiptSchema";
import type { MasterItem, Receipt, MasterItemType } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { MasterForm } from "@/components/app/masters/MasterForm";

interface AddReceiptFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (receipt: Receipt) => void;
  parties: MasterItem[]; 
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  receiptToEdit?: Receipt | null;
}

export const AddReceiptForm: React.FC<AddReceiptFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  parties, 
  onMasterDataUpdate,
  receiptToEdit
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<MasterItemType | null>(null);
  const [masterItemToEdit, setMasterItemToEdit] = React.useState<MasterItem | null>(null);

  const getDefaultValues = React.useCallback((): ReceiptFormValues => {
    if (receiptToEdit) {
      return {
        date: new Date(receiptToEdit.date),
        partyId: receiptToEdit.partyId,
        amount: receiptToEdit.amount,
        paymentMethod: receiptToEdit.paymentMethod,
        transactionType: receiptToEdit.transactionType || 'On Account',
        source: receiptToEdit.source || "",
        notes: receiptToEdit.notes || "",
        cashDiscount: receiptToEdit.cashDiscount || undefined,
        relatedSaleIds: receiptToEdit.relatedSaleIds || [],
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
      cashDiscount: undefined,
      relatedSaleIds: [],
    };
  }, [receiptToEdit]);

  const methods = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema(parties)),
    defaultValues: getDefaultValues(),
  });

  React.useEffect(() => {
    if(isOpen) {
      methods.reset(getDefaultValues());
    }
  }, [receiptToEdit, isOpen, methods, getDefaultValues]);

  const handleOpenMasterForm = (type: MasterItemType = "Customer") => {
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
    if (newItem.type === "Customer" || newItem.type === "Broker") { 
        methods.setValue('partyId', newItem.id, { shouldValidate: true });
    }
    setIsMasterFormOpen(false);
    setMasterItemToEdit(null);
    toast({ title: `${newItem.type} "${newItem.name}" added/updated successfully!` });
  };

  const processSubmit = React.useCallback((values: ReceiptFormValues) => {
    if (!values.partyId || !values.amount || values.amount <= 0) {
      toast({ title: "Missing Info", description: "Please select a party and enter a valid amount received.", variant: "destructive" });
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

    const receiptData: Receipt = {
      id: receiptToEdit ? receiptToEdit.id : `receipt-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      partyId: values.partyId as string,
      partyName: selectedParty.name,
      partyType: selectedParty.type as MasterItemType,
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      transactionType: values.transactionType,
      source: values.source,
      notes: values.notes,
      cashDiscount: values.cashDiscount || 0,
      relatedSaleIds: values.relatedSaleIds || [],
    };
    onSubmit(receiptData);
    setIsSubmitting(false);
    onClose();
  }, [receiptToEdit, parties, onSubmit, methods, onClose, toast]);

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{receiptToEdit ? 'Edit Receipt' : 'Add New Receipt'}</DialogTitle>
            <DialogDescription>
              Enter the details for the receipt. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}> 
              <form onSubmit={methods.handleSubmit(processSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
                <FormField
                  control={methods.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Receipt Date</FormLabel>
                      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              setIsDatePickerOpen(false);
                            }}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="partyId"
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel>Party (Customer/Broker)</FormLabel>
                      <MasterDataCombobox
                        value={field.value}
                        onChange={field.onChange}
                        options={parties.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))}
                        placeholder="Select Party"
                        searchPlaceholder="Search customers/brokers..."
                        notFoundMessage="No party found."
                        addNewLabel="Add New Party"
                        onAddNew={() => {
                            const currentPartyValue = methods.getValues("partyId");
                            const currentParty = parties.find(p => p.id === currentPartyValue);
                            handleOpenMasterForm(currentParty?.type || 'Customer');
                        }}
                        onEdit={handleEditMasterItem}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount Received (₹)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="Enter amount received" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={methods.control}
                  name="cashDiscount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cash Discount (₹, Optional)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="e.g., 200" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="transactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'On Account'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select receipt type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="On Account">On Account</SelectItem>
                          <SelectItem value="Against Bill">Against Bill</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'Cash'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select receipt method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank">Bank</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={methods.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., Self, From Bank" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Add any notes for this receipt..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <DialogClose asChild>
                      <Button type="button" variant="outline" onClick={() => { onClose();}}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (receiptToEdit ? "Saving..." : "Adding...") : (receiptToEdit ? "Save Changes" : "Add Receipt")}
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
          onClose={() => {
            setIsMasterFormOpen(false);
            setMasterItemToEdit(null);
          }}
          onSubmit={handleMasterFormSubmit}
          initialData={masterItemToEdit}
          itemTypeFromButton={masterFormItemType!} 
        />
      )}
    </>
  );
};
