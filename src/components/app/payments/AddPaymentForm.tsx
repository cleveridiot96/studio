
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
import { CalendarIcon, Users, Truck, UserCheck, Handshake, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { paymentSchema, type PaymentFormValues } from "@/lib/schemas/paymentSchema";
import type { MasterItem, Payment, MasterItemType } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface AddPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payment: Payment) => void;
  parties: MasterItem[]; 
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  paymentToEdit?: Payment | null;
}

const AddPaymentFormComponent: React.FC<AddPaymentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  parties,
  onMasterDataUpdate,
  paymentToEdit
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const getDefaultValues = React.useCallback((): PaymentFormValues => {
    if (paymentToEdit) {
      return {
        date: new Date(paymentToEdit.date),
        partyId: paymentToEdit.partyId,
        amount: paymentToEdit.amount,
        paymentMethod: paymentToEdit.paymentMethod,
        referenceNo: paymentToEdit.referenceNo || "",
        notes: paymentToEdit.notes || "",
      };
    }
    return {
      date: new Date(),
      partyId: undefined,
      amount: 0,
      paymentMethod: 'Cash',
      referenceNo: "",
      notes: "",
    };
  }, [paymentToEdit]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema(parties)),
    defaultValues: getDefaultValues(),
  });

  React.useEffect(() => {
    form.reset(getDefaultValues());
  }, [paymentToEdit, isOpen, form, getDefaultValues]);

  const handleAddNewMasterClicked = (type: MasterItemType) => {
    toast({ title: "Info", description: `Adding new ${type} from here is a planned feature.`});
  };

  const processSubmit = React.useCallback((values: PaymentFormValues) => {
    setIsSubmitting(true);
    const selectedParty = parties.find(p => p.id === values.partyId);
    if (!selectedParty) {
      toast({ title: "Error", description: "Selected party not found.", variant: "destructive"});
      setIsSubmitting(false);
      return;
    }

    const paymentData: Payment = {
      id: paymentToEdit ? paymentToEdit.id : `payment-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      partyId: values.partyId as string,
      partyName: selectedParty.name,
      partyType: selectedParty.type,
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      referenceNo: values.referenceNo,
      notes: values.notes,
    };
    onSubmit(paymentData);
    setIsSubmitting(false);
    form.reset(getDefaultValues());
    onClose();
  }, [paymentToEdit, parties, onSubmit, form, getDefaultValues, onClose, toast]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { form.reset(getDefaultValues()); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{paymentToEdit ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
          <DialogDescription>
            Enter the details for the payment. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}> {/* This provides the FormProvider context */}
          <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
                  <Popover>
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
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="partyId"
              render={({ field }) => ( // field not directly used by new combobox
                <FormItem>
                  <FormLabel>Party</FormLabel>
                  <MasterDataCombobox
                    name="partyId" // react-hook-form field name
                    options={parties.map(p => ({ value: p.id, label: `${p.name} (${p.type})`, type: p.type }))}
                    placeholder="Select Party"
                    searchPlaceholder="Search parties..."
                    notFoundMessage="No party found."
                    addNewLabel="Add New Party"
                    onAddNew={() => {
                        // This needs to be smarter, maybe open a sub-dialog to choose party type first
                        handleAddNewMasterClicked('Supplier'); 
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl><Input type="number" step="0.01" placeholder="Enter amount" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'Cash'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
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
              control={form.control}
              name="referenceNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference No. (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., Cheque No., UPI ID" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Add any notes for this payment..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => { form.reset(getDefaultValues()); onClose(); }}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (paymentToEdit ? "Saving..." : "Adding...") : (paymentToEdit ? "Save Changes" : "Add Payment")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export const AddPaymentForm = React.memo(AddPaymentFormComponent);
