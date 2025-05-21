
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
  parties: MasterItem[]; // Combined list of Supplier, Agent, Broker, Transporter
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
      partyId: undefined, // Important: react-hook-form prefers undefined for unselected controlled components
      amount: 0,
      paymentMethod: 'Cash',
      referenceNo: "",
      notes: "",
    };
  }, [paymentToEdit]);

  const methods = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema(parties)), // Pass parties for validation
    defaultValues: getDefaultValues(),
  });

  React.useEffect(() => {
    // Reset form when dialog opens/closes or when paymentToEdit changes
    if (isOpen) {
      methods.reset(getDefaultValues());
    }
  }, [isOpen, paymentToEdit, methods, getDefaultValues]);

  const handleOpenMasterForm = (type: MasterItemType = "Supplier") => { // Default to supplier or make it smarter
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem); // Update the main list in PaymentsClient
    setIsMasterFormOpen(false);
    setMasterFormItemType(null);
    // Attempt to set the newly added party in the combobox
    methods.setValue('partyId', newItem.id, { shouldValidate: true });
    toast({ title: `${newItem.type} "${newItem.name}" added and selected.` });
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
      partyId: values.partyId as string, // partyId is validated to be a string by schema
      partyName: selectedParty.name,
      partyType: selectedParty.type, // Ensure partyType is captured
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      referenceNo: values.referenceNo,
      notes: values.notes,
    };
    onSubmit(paymentData);
    setIsSubmitting(false);
    // methods.reset(getDefaultValues()); // Reset after successful submission
    onClose(); // Close the dialog
  }, [paymentToEdit, parties, onSubmit, methods, onClose, toast]);

  const handleCloseDialog = () => {
    // methods.reset(getDefaultValues()); // Reset form on cancel as well
    onClose();
  };


  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); }}>
        <DialogContent className="sm:max-w-lg" style={{ zIndex: 160 }}> {/* Ensure dialog is above others if needed */}
          <DialogHeader>
            <DialogTitle>{paymentToEdit ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
            <DialogDescription>
              Enter the details for the payment. Click save when you&apos;re done.
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
                  control={methods.control}
                  name="partyId"
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel>Party</FormLabel>
                       <MasterDataCombobox
                        name="partyId" // This name is used by useController inside MasterDataCombobox
                        options={parties.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))}
                        placeholder="Select Party"
                        searchPlaceholder="Search parties..."
                        notFoundMessage="No party found."
                        addNewLabel="Add New Party"
                        onAddNew={() => {
                            // Infer type based on selection or default
                            const currentPartyValue = methods.getValues("partyId");
                            const currentParty = parties.find(p => p.id === currentPartyValue);
                            handleOpenMasterForm(currentParty?.type || 'Supplier');
                        }}
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
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="Enter amount" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
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
                  control={methods.control}
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
                  control={methods.control}
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
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
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

// export const AddPaymentForm = React.memo(AddPaymentFormComponent); // Memoization removed for directness during debug
