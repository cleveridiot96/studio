
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
import { CalendarIcon, Info, Percent } from "lucide-react"; // Removed Check
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { saleSchema, type SaleFormValues, Sale } from "@/lib/schemas/saleSchema";
import type { MasterItem, MasterItemType, Purchase } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MasterForm } from "@/components/app/masters/MasterForm";

interface AddSaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sale: Sale) => void;
  customers: MasterItem[];
  transporters: MasterItem[];
  brokers: MasterItem[];
  inventoryLots: Purchase[]; 
  existingSales: Sale[]; 
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  saleToEdit?: Sale | null;
}

const AddSaleFormComponent: React.FC<AddSaleFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  customers,
  transporters,
  brokers,
  inventoryLots,
  existingSales,
  onMasterDataUpdate,
  saleToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<MasterItemType | null>(null);

  const getDefaultValues = React.useCallback((): SaleFormValues => {
    if (saleToEdit) {
      return {
        date: new Date(saleToEdit.date),
        billNumber: saleToEdit.billNumber || "",
        billAmount: saleToEdit.billAmount || undefined,
        cutBill: saleToEdit.cutBill || false,
        customerId: saleToEdit.customerId,
        lotNumber: saleToEdit.lotNumber,
        quantity: saleToEdit.quantity,
        netWeight: saleToEdit.netWeight,
        rate: saleToEdit.rate,
        transporterId: saleToEdit.transporterId || undefined,
        transportCost: saleToEdit.transportCost || undefined,
        brokerId: saleToEdit.brokerId || undefined,
        brokerageType: saleToEdit.brokerageType || undefined,
        brokerageAmount: saleToEdit.brokerageAmount || undefined,
        notes: saleToEdit.notes || "",
      };
    }
    return {
      date: new Date(),
      billNumber: "",
      billAmount: undefined,
      cutBill: false,
      customerId: undefined,
      lotNumber: undefined,
      quantity: 0,
      netWeight: 0,
      rate: 0,
      transporterId: undefined,
      transportCost: undefined,
      brokerId: undefined,
      brokerageType: undefined,
      brokerageAmount: undefined,
      notes: "",
    };
  }, [saleToEdit]);

  const methods = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema(customers, transporters, brokers, inventoryLots, existingSales, saleToEdit?.id)),
    defaultValues: getDefaultValues(),
  });
  const { control, watch, reset } = methods; // Removed setValue as it's handled by useController in MasterDataCombobox

  React.useEffect(() => {
    reset(getDefaultValues());
  }, [saleToEdit, isOpen, reset, getDefaultValues]);

  const netWeight = watch("netWeight");
  const rate = watch("rate");
  const billAmountManual = watch("billAmount");
  
  const selectedBrokerId = watch("brokerId");
  const brokerageType = watch("brokerageType");
  const brokerageValue = watch("brokerageAmount") || 0;

  const calculatedBillAmount = React.useMemo(() => {
    const nw = parseFloat(String(netWeight || 0));
    const r = parseFloat(String(rate || 0));
    return nw * r;
  }, [netWeight, rate]);

  const finalBillAmountToUse = billAmountManual !== undefined && billAmountManual > 0 ? billAmountManual : calculatedBillAmount;

  const calculatedBrokerageCommission = React.useMemo(() => {
    if (selectedBrokerId && brokerageType && brokerageValue > 0) {
      if (brokerageType === 'Percentage') {
        return (finalBillAmountToUse * brokerageValue) / 100;
      }
      return brokerageValue; 
    }
    return 0;
  }, [selectedBrokerId, brokerageType, brokerageValue, finalBillAmountToUse]);

  const totalAmountForCustomer = finalBillAmountToUse;


  const handleOpenMasterForm = (type: MasterItemType) => {
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem);
     if (newItem.type === masterFormItemType) {
        if (newItem.type === 'Customer') methods.setValue('customerId', newItem.id, { shouldValidate: true });
        if (newItem.type === 'Transporter') methods.setValue('transporterId', newItem.id, { shouldValidate: true });
        if (newItem.type === 'Broker') methods.setValue('brokerId', newItem.id, { shouldValidate: true });
    }
    setIsMasterFormOpen(false);
    setMasterFormItemType(null);
    toast({ title: `${newItem.type} "${newItem.name}" added successfully and selected!` });
  };
  
  const processSubmit = (values: SaleFormValues) => {
    setIsSubmitting(true);
    const selectedCustomer = customers.find(c => c.id === values.customerId);
    const selectedLot = inventoryLots.find(lot => lot.lotNumber === values.lotNumber);

    if (!selectedCustomer || !selectedLot) {
      toast({ title: "Error", description: "Customer or Lot not found.", variant: "destructive"});
      setIsSubmitting(false);
      return;
    }

    const saleData: Sale = {
      id: saleToEdit?.id || `sale-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      billNumber: values.billNumber,
      billAmount: values.billAmount, 
      cutBill: values.cutBill,
      customerId: values.customerId as string,
      customerName: selectedCustomer.name,
      lotNumber: values.lotNumber as string,
      quantity: values.quantity,
      netWeight: values.netWeight,
      rate: values.rate,
      transporterId: values.transporterId,
      transporterName: transporters.find(t => t.id === values.transporterId)?.name,
      transportCost: values.transportCost,
      brokerId: values.brokerId,
      brokerName: brokers.find(b => b.id === values.brokerId)?.name,
      brokerageType: values.brokerageType,
      brokerageAmount: values.brokerageAmount, 
      calculatedBrokerageCommission: calculatedBrokerageCommission,
      notes: values.notes,
      totalAmount: totalAmountForCustomer,
    };
    onSubmit(saleData);
    setIsSubmitting(false);
    reset(getDefaultValues());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(open) => { if (!open) { reset(getDefaultValues()); onClose(); } }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{saleToEdit ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
            <DialogDescription>Enter the details for the sale record.</DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}>
              <form onSubmit={methods.handleSubmit(processSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
                {/* Section: Basic Details */}
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Sale Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Sale Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild><FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover><FormMessage />
                      </FormItem>)}
                    />
                    <FormField control={control} name="billNumber" render={({ field }) => (
                      <FormItem><FormLabel>Bill Number (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., INV-001" {...field} /></FormControl><FormMessage /></FormItem>)}
                    />
                    <FormField control={control} name="billAmount" render={({ field }) => (
                      <FormItem><FormLabel>Bill Amount (₹, Manual)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="Overrides auto-calc" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                      <FormMessage /></FormItem>)}
                    />
                  </div>
                  <FormField control={control} name="cutBill" render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 mt-4 pt-4 border-t">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="font-normal cursor-pointer mt-0!">Is this a "Cut Bill"?</FormLabel>
                          <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section: Product & Customer */}
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Product &amp; Customer</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={control} name="lotNumber" render={({ field }) => ( // field used by useController in combobox
                      <FormItem><FormLabel>Vakkal / Lot Number</FormLabel>
                      <MasterDataCombobox 
                        name="lotNumber" 
                        options={inventoryLots.map(p => ({ value: p.lotNumber, label: `${p.lotNumber} (${p.locationName} - Avl: ${p.quantity - (existingSales.filter(s=>s.lotNumber === p.lotNumber && s.id !== saleToEdit?.id).reduce((sum,s)=>sum+s.quantity,0))} bags)` }))} 
                        placeholder="Select Lot" 
                        searchPlaceholder="Search lots..."
                        notFoundMessage="Lot not found or out of stock."
                        // No onAddNew for lots, they come from purchases
                      />
                      <FormMessage /></FormItem>)}
                    />
                    <FormField control={control} name="customerId" render={({ field }) => (
                      <FormItem><FormLabel>Customer</FormLabel>
                      <MasterDataCombobox 
                        name="customerId" 
                        options={customers.map(c => ({ value: c.id, label: c.name }))} 
                        placeholder="Select Customer"
                        searchPlaceholder="Search customers..."
                        notFoundMessage="Customer not found."
                        addNewLabel="Add New Customer"
                        onAddNew={() => handleOpenMasterForm("Customer")}
                      />
                      <FormMessage /></FormItem>)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <FormField control={control} name="quantity" render={({ field }) => (
                          <FormItem><FormLabel>No. of Bags</FormLabel>
                          <FormControl><Input type="number" placeholder="e.g., 50" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)}
                      />
                      <FormField control={control} name="netWeight" render={({ field }) => (
                          <FormItem><FormLabel>Net Weight (kg)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 2500" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)}
                      />
                      <FormField control={control} name="rate" render={({ field }) => (
                          <FormItem><FormLabel>Sale Rate (₹/kg)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 25.50" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)}
                      />
                  </div>
                </div>
              
                {/* Section: Transport & Broker */}
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Transport &amp; Broker (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                      <FormField control={control} name="transporterId" render={({ field }) => (
                          <FormItem><FormLabel>Transporter</FormLabel>
                          <MasterDataCombobox 
                            name="transporterId" 
                            options={transporters.map(t => ({ value: t.id, label: t.name }))} 
                            placeholder="Select Transporter" 
                            searchPlaceholder="Search transporters..."
                            notFoundMessage="Transporter not found."
                            addNewLabel="Add New Transporter"
                            onAddNew={() => handleOpenMasterForm("Transporter")}
                          />
                          <FormMessage /></FormItem>)}
                      />
                      <FormField control={control} name="transportCost" render={({ field }) => (
                          <FormItem><FormLabel>Transport Cost (₹)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 500" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)}
                      />
                      <FormField control={control} name="brokerId" render={({ field }) => (
                          <FormItem><FormLabel>Broker</FormLabel>
                          <MasterDataCombobox 
                            name="brokerId" 
                            options={brokers.map(b => ({ value: b.id, label: b.name }))} 
                            placeholder="Select Broker" 
                            searchPlaceholder="Search brokers..."
                            notFoundMessage="Broker not found."
                            addNewLabel="Add New Broker"
                            onAddNew={() => handleOpenMasterForm("Broker")}
                          />
                          <FormMessage /></FormItem>)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                          <FormField control={control} name="brokerageType" render={({ field }) => (
                              <FormItem><FormLabel>Brokerage Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedBrokerId}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger></FormControl>
                                  <SelectContent><SelectItem value="Fixed">Fixed (₹)</SelectItem><SelectItem value="Percentage">%</SelectItem></SelectContent>
                              </Select><FormMessage /></FormItem>)}
                          />
                          <FormField control={control} name="brokerageAmount" render={({ field }) => (
                              <FormItem><FormLabel>Brokerage Value</FormLabel>
                              <div className="relative">
                                  <FormControl><Input type="number" step="0.01" placeholder="Value" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} disabled={!selectedBrokerId || !brokerageType} className={brokerageType === 'Percentage' ? "pr-8" : ""}/></FormControl>
                                  {brokerageType === 'Percentage' && <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                              </div>
                              <FormMessage /></FormItem>)}
                          />
                      </div>
                  </div>
                </div>

                {/* Section: Notes */}
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Notes</h3>
                  <FormField control={control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel className="sr-only">Notes</FormLabel>
                      <FormControl><Textarea placeholder="Add any notes for this sale..." {...field} /></FormControl><FormMessage /></FormItem>)}
                    />
                </div>

                {/* Calculated Summary */}
                <div className="p-4 border border-dashed rounded-md bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center text-md font-semibold">
                          <Info className="w-5 h-5 mr-2 text-primary" />
                          Calculated Total Sale Value:
                      </div>
                      <p className="text-xl font-bold text-primary">
                      ₹{totalAmountForCustomer.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                  </div>
                  {calculatedBrokerageCommission > 0 && (
                      <p className="text-sm text-muted-foreground pl-7">
                          Calculated Brokerage Commission: <span className="font-semibold">₹{calculatedBrokerageCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </p>
                  )}
                </div>

                <DialogFooter className="pt-4">
                  <DialogClose asChild>
                      <Button type="button" variant="outline" onClick={() => { reset(getDefaultValues()); onClose();}}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (saleToEdit ? "Saving..." : "Adding...") : (saleToEdit ? "Save Changes" : "Add Sale")}
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
}

export const AddSaleForm = React.memo(AddSaleFormComponent);
