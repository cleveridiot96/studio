
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
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { paymentSchema, type PaymentFormValues } from "@/lib/schemas/paymentSchema";
import type { MasterItem, Payment, MasterItemType } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { MasterForm } from "@/components/app/masters/MasterForm";

interface AddPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payment: Payment) => void;
  parties: MasterItem[];
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  paymentToEdit?: Payment | null;
}

export const AddPaymentForm: React.FC<AddPaymentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  parties,
  onMasterDataUpdate,
  paymentToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<MasterItemType | null>(null);

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

  const methods = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema(parties)),
    defaultValues: getDefaultValues(),
  });
  const { control, handleSubmit, reset, getValues } = methods;

  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
    }
  }, [isOpen, reset, getDefaultValues]);

  const handleOpenMasterForm = (type: MasterItemType = "Supplier") => {
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem);
    setIsMasterFormOpen(false);
    setMasterFormItemType(null);
    methods.setValue('partyId', newItem.id, { shouldValidate: true });
    toast({ title: `${newItem.type} "${newItem.name}" added and selected.` });
  };

  const processSubmit = (values: PaymentFormValues) => {
    if (!values.partyId || values.amount <= 0) {
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
      referenceNo: values.referenceNo,
      notes: values.notes,
    };
    onSubmit(paymentData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog modal={false} open={isOpen && !isMasterFormOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{paymentToEdit ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
            <DialogDescription>
              Enter the details for the payment. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}>
              <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-3">
                <FormField
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Date</FormLabel>
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="partyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party</FormLabel>
                       <MasterDataCombobox
                        value={field.value}
                        onChange={field.onChange}
                        options={parties.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))}
                        placeholder="Select Party"
                        searchPlaceholder="Search parties..."
                        notFoundMessage="No party found."
                        addNewLabel="Add New Party"
                        onAddNew={() => {
                            const currentPartyValue = getValues("partyId");
                            const currentParty = parties.find(p => p.id === currentPartyValue);
                            handleOpenMasterForm(currentParty?.type || 'Supplier');
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
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
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <ShadSelect onValueChange={field.onChange} value={field.value || 'Cash'}>
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
                      </ShadSelect>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
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
                  control={control}
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
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (paymentToEdit ? "Saving..." : "Adding...") : (paymentToEdit ? "Save Changes" : "Add Payment")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {isMasterFormOpen && masterFormItemType && (
        <MasterForm
          isOpen={isMasterFormOpen}
          onClose={() => {
            setIsMasterFormOpen(false);
            setMasterFormItemType(null);
          }}
          onSubmit={handleMasterFormSubmit}
          itemTypeFromButton={masterFormItemType}
        />
      )}
    </>
  );
};
