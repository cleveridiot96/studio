
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
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Info, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { saleSchema, type SaleFormValues } from '@/lib/schemas/saleSchema'; // Sale type import removed, already in types
import type { MasterItem, MasterItemType, Purchase, Sale, Broker } from '@/lib/types';
import { MasterDataCombobox } from '@/components/shared/MasterDataCombobox';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MasterForm } from '@/components/app/masters/MasterForm';

interface AddSaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sale: Sale) => void;
  customers: MasterItem[];
  transporters: MasterItem[];
  brokers: Broker[]; // Changed to Broker[] for specific commissionRate access
  inventoryLots: Purchase[];
  existingSales: Sale[]; 
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  saleToEdit?: Sale | null;
}

export const AddSaleForm: React.FC<AddSaleFormProps> = ({
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
  const [netWeightManuallySet, setNetWeightManuallySet] = React.useState(false);
  const [brokerageValueManuallySet, setBrokerageValueManuallySet] = React.useState(false);

  const getDefaultValues = React.useCallback((): SaleFormValues => {
    if (saleToEdit) {
      return {
        date: new Date(saleToEdit.date),
        billNumber: saleToEdit.billNumber || "",
        billAmount: saleToEdit.billAmount,
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
        brokerageValue: saleToEdit.brokerageValue || undefined,
        notes: saleToEdit.notes || "",
        calculatedBrokerageCommission: saleToEdit.calculatedBrokerageCommission || 0,
        // profit field is not part of form values, it's calculated
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
      brokerageValue: undefined,
      notes: "",
      calculatedBrokerageCommission: 0,
    };
  }, [saleToEdit]);

  const methods = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema(customers, transporters, brokers, inventoryLots, existingSales, saleToEdit?.id)),
    defaultValues: getDefaultValues(),
  });
  const { control, watch, reset, setValue, formState: { dirtyFields } } = methods;

  React.useEffect(() => {
    if(isOpen){
      reset(getDefaultValues());
      setNetWeightManuallySet(!!saleToEdit?.netWeight);
      setBrokerageValueManuallySet(!!saleToEdit?.brokerageValue);
    }
  }, [saleToEdit, isOpen, reset, getDefaultValues]);

  const quantity = watch("quantity");
  const netWeight = watch("netWeight");
  const rate = watch("rate");
  const billAmountManual = watch("billAmount");
  const transportCost = watch("transportCost") || 0;
  const selectedBrokerId = watch("brokerId");
  const brokerageType = watch("brokerageType");
  const brokerageValue = watch("brokerageValue"); // This is the direct input value for fixed or percentage rate
  
  // Auto-calculate Net Weight if not manually set
  React.useEffect(() => {
    if (typeof quantity === 'number' && quantity > 0 && !netWeightManuallySet && !dirtyFields.netWeight) {
      setValue("netWeight", quantity * 50, { shouldValidate: true });
    }
  }, [quantity, setValue, dirtyFields.netWeight, netWeightManuallySet]);

  const calculatedBillAmount = React.useMemo(() => {
    const finalNetWeight = netWeight !== undefined && netWeight > 0 ? netWeight : (quantity || 0) * 50;
    const r = parseFloat(String(rate || 0));
    return finalNetWeight * r;
  }, [quantity, netWeight, rate]);

  const finalBillAmountToUse = billAmountManual !== undefined && billAmountManual > 0 ? billAmountManual : calculatedBillAmount;

  // Auto-populate brokerage from master
  React.useEffect(() => {
    if (selectedBrokerId && !brokerageValueManuallySet && !dirtyFields.brokerageType && !dirtyFields.brokerageValue) {
      const brokerDetails = brokers.find(b => b.id === selectedBrokerId);
      if (brokerDetails && brokerDetails.commission !== undefined) {
        setValue("brokerageType", "Percentage", { shouldValidate: true });
        setValue("brokerageValue", brokerDetails.commission, { shouldValidate: true });
      }
    }
  }, [selectedBrokerId, brokers, setValue, dirtyFields.brokerageType, dirtyFields.brokerageValue, brokerageValueManuallySet]);

  const calculatedBrokerageCommission = React.useMemo(() => {
    if (!selectedBrokerId || brokerageValue === undefined) return 0;
    const finalNetWeightForCalc = netWeight !== undefined && netWeight > 0 ? netWeight : (quantity || 0) * 50;
    const saleRateForCalc = parseFloat(String(rate || 0));

    if (brokerageType === "Percentage") {
      return (finalNetWeightForCalc * saleRateForCalc * (brokerageValue / 100));
    } else if (brokerageType === "Fixed") {
      return brokerageValue;
    }
    return 0;
  }, [selectedBrokerId, brokerageType, brokerageValue, netWeight, quantity, rate]);

  const selectedLotDetails = inventoryLots.find(lot => lot.lotNumber === watch("lotNumber"));
  const purchaseRateForLot = selectedLotDetails ? selectedLotDetails.rate : 0;

  const calculatedProfit = React.useMemo(() => {
    const finalNetWeightForCalc = netWeight !== undefined && netWeight > 0 ? netWeight : (quantity || 0) * 50;
    const costOfGoodsSold = finalNetWeightForCalc * purchaseRateForLot;
    const saleValue = finalBillAmountToUse; // This is the revenue part
    
    return saleValue - costOfGoodsSold - transportCost - calculatedBrokerageCommission;
  }, [finalBillAmountToUse, netWeight, quantity, purchaseRateForLot, transportCost, calculatedBrokerageCommission]);


  React.useEffect(() => {
     setValue('calculatedBrokerageCommission', calculatedBrokerageCommission);
  },[calculatedBrokerageCommission, setValue]);

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
    if (!values.customerId || !values.lotNumber) {
        toast({ title: "Missing Info", description: "Customer and Lot Number are required.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    const selectedCustomer = customers.find(c => c.id === values.customerId);
    
    const saleData: Sale = {
      id: saleToEdit?.id || `sale-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      billNumber: values.billNumber,
      billAmount: values.billAmount, 
      cutBill: values.cutBill,
      customerId: values.customerId as string,
      customerName: selectedCustomer?.name,
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
      brokerageValue: values.brokerageValue, // Store the input value (rate or fixed amount)
      calculatedBrokerageCommission: calculatedBrokerageCommission, // Store the calculated commission
      notes: values.notes,
      totalAmount: finalBillAmountToUse, // This is the final amount for the customer
      calculatedProfit: calculatedProfit, // Store the calculated profit
    };
    onSubmit(saleData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog modal={false} open={isOpen && !isMasterFormOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{saleToEdit ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
            <DialogDescription>Enter the details for the sale record.</DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}>
              <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
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
                      <FormControl><Input type="number" step="0.01" placeholder="Overrides auto-calc" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
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
                    <FormField control={control} name="lotNumber" render={({ field }) => (
                      <FormItem><FormLabel>Vakkal / Lot Number</FormLabel>
                      <MasterDataCombobox 
                        name={field.name}
                        options={inventoryLots.map(p => {
                          const salesForThisLot = existingSales.filter(s => s.lotNumber === p.lotNumber && s.id !== saleToEdit?.id);
                          const bagsSoldFromLot = salesForThisLot.reduce((sum, s) => sum + (s.quantity || 0), 0);
                          const availableBags = (p.quantity || 0) - bagsSoldFromLot;
                          return {
                            value: p.lotNumber,
                            label: `${p.lotNumber} (${p.locationName || p.locationId} - Avl: ${availableBags} bags)`
                          };
                        }).filter(opt => opt.label.includes("Avl: ") ? parseInt(opt.label.substring(opt.label.indexOf("Avl: ") + 5).split(" ")[0]) > 0 : true)}
                        placeholder="Select Lot" 
                        searchPlaceholder="Search lots..."
                        notFoundMessage="Lot not found or out of stock."
                      />
                      <FormMessage /></FormItem>)}
                    />
                    <FormField control={control} name="customerId" render={({ field }) => (
                      <FormItem><FormLabel>Customer</FormLabel>
                      <MasterDataCombobox
                        name={field.name} 
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
                          <FormControl><Input type="number" placeholder="e.g., 50" {...field} value={field.value || ''} 
                            onChange={e => {
                              field.onChange(parseFloat(e.target.value) || 0);
                            }} 
                          /></FormControl><FormMessage /></FormItem>)}
                      />
                     <FormField control={control} name="netWeight" render={({ field }) => (
                          <FormItem><FormLabel>Net Weight (kg)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 2500" {...field} value={field.value || ''} 
                            onChange={e => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              setNetWeightManuallySet(true);
                            }}
                            onFocus={() => setNetWeightManuallySet(true)}
                          /></FormControl><FormMessage /></FormItem>)}
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
                            name={field.name}
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
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 500" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)}
                      />
                      <FormField control={control} name="brokerId" render={({ field }) => (
                          <FormItem><FormLabel>Broker</FormLabel>
                          <MasterDataCombobox 
                            name={field.name}
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
                              <Select onValueChange={(value) => { field.onChange(value); setBrokerageValueManuallySet(false);}} value={field.value} disabled={!selectedBrokerId}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger></FormControl>
                                  <SelectContent><SelectItem value="Fixed">Fixed (₹)</SelectItem><SelectItem value="Percentage">%</SelectItem></SelectContent>
                              </Select><FormMessage /></FormItem>)}
                          />
                          <FormField control={control} name="brokerageValue" render={({ field }) => (
                              <FormItem><FormLabel>Brokerage Value</FormLabel>
                              <div className="relative">
                                  <FormControl><Input 
                                    type="number" step="0.01" placeholder="Value" {...field} 
                                    value={field.value ?? ''} 
                                    onChange={e => { field.onChange(parseFloat(e.target.value) || undefined); setBrokerageValueManuallySet(true); }} 
                                    onFocus={() => setBrokerageValueManuallySet(true)}
                                    disabled={!selectedBrokerId || !brokerageType} className={brokerageType === 'Percentage' ? "pr-8" : ""}/></FormControl>
                                  {brokerageType === 'Percentage' && <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                              </div>
                              <FormMessage /></FormItem>)}
                          />
                      </div>
                  </div>
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Notes</h3>
                  <FormField control={control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel className="sr-only">Notes</FormLabel>
                      <FormControl><Textarea placeholder="Add any notes for this sale..." {...field} /></FormControl><FormMessage /></FormItem>)}
                    />
                </div>

                <div className="p-4 border border-dashed rounded-md bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center text-md font-semibold">
                          <Info className="w-5 h-5 mr-2 text-primary" />
                          Total for Customer:
                      </div>
                      <p className="text-xl font-bold text-primary">
                      ₹{finalBillAmountToUse.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                  </div>
                  {calculatedBrokerageCommission > 0 && (
                      <p className="text-sm text-muted-foreground pl-7">
                          Calculated Brokerage: <span className="font-semibold">₹{calculatedBrokerageCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </p>
                  )}
                   <div className="flex items-center justify-between">
                      <div className="flex items-center text-md font-semibold">
                          <Info className="w-5 h-5 mr-2 text-primary" />
                          Est. Profit on this Sale:
                      </div>
                      <p className={`text-xl font-bold ${calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{calculatedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <DialogClose asChild>
                      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
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
};
