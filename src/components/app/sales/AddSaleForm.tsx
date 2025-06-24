
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
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Info, Percent } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { saleSchema, type SaleFormValues } from '@/lib/schemas/saleSchema';
import type { MasterItem, MasterItemType, Purchase, Sale, Broker, Customer, Transporter } from '@/lib/types';
import { MasterDataCombobox } from '@/components/shared/MasterDataCombobox';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MasterForm } from '@/components/app/masters/MasterForm';

interface AddSaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sale: Sale) => void;
  customers: Customer[];
  transporters: Transporter[];
  brokers: Broker[];
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

  const [netWeightManuallySet, setNetWeightManuallySet] = React.useState(!!saleToEdit?.netWeight);
  const [brokerageValueManuallySet, setBrokerageValueManuallySet] = React.useState(!!saleToEdit?.brokerageValue);
  const [purchaseRateForLot, setPurchaseRateForLot] = React.useState<number>(0);
  const [lastSoldRate, setLastSoldRate] = React.useState<number | null>(null);

  const getDefaultValues = React.useCallback((): SaleFormValues => {
    if (saleToEdit) {
      return {
        date: new Date(saleToEdit.date),
        billNumber: saleToEdit.billNumber || "",
        cutAmount: saleToEdit.cutAmount === undefined || saleToEdit.cutAmount === null ? undefined : saleToEdit.cutAmount,
        cutBill: saleToEdit.cutBill || false,
        customerId: saleToEdit.customerId,
        lotNumber: saleToEdit.lotNumber,
        quantity: saleToEdit.quantity,
        netWeight: saleToEdit.netWeight,
        rate: saleToEdit.rate,
        transporterId: saleToEdit.transporterId || undefined,
        transportCost: saleToEdit.transportCost === undefined || saleToEdit.transportCost === null ? undefined : saleToEdit.transportCost,
        brokerId: saleToEdit.brokerId || undefined,
        brokerageType: saleToEdit.brokerageType || undefined,
        brokerageValue: saleToEdit.brokerageValue === undefined || saleToEdit.brokerageValue === null ? undefined : saleToEdit.brokerageValue,
        extraBrokeragePerKg: saleToEdit.extraBrokeragePerKg === undefined || saleToEdit.extraBrokeragePerKg === null ? undefined : saleToEdit.extraBrokeragePerKg,
        notes: saleToEdit.notes || "",
      };
    }
    return {
      date: new Date(),
      billNumber: "",
      cutAmount: undefined,
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
      extraBrokeragePerKg: undefined,
      notes: "",
    };
  }, [saleToEdit]);

  const memoizedDefaultValues = React.useMemo(() => getDefaultValues(), [getDefaultValues]);

  const memoizedSaleSchema = React.useMemo(() =>
    saleSchema(customers, transporters, brokers, inventoryLots, existingSales, saleToEdit?.id)
  , [customers, transporters, brokers, inventoryLots, existingSales, saleToEdit]);

  const methods = useForm<SaleFormValues>({
    resolver: zodResolver(memoizedSaleSchema),
    defaultValues: memoizedDefaultValues,
  });
  const { control, watch, reset, setValue, handleSubmit, formState: { errors } } = methods;


  React.useEffect(() => {
    if (isOpen) {
      reset(memoizedDefaultValues);
      setNetWeightManuallySet(!!saleToEdit?.netWeight);
      setBrokerageValueManuallySet(!!saleToEdit?.brokerageValue);
      if (saleToEdit && saleToEdit.lotNumber) {
        const originalPurchase = inventoryLots.find(p => p.lotNumber === saleToEdit.lotNumber);
        setPurchaseRateForLot(originalPurchase?.rate || 0);
      } else {
        setPurchaseRateForLot(0);
      }
    }
  }, [isOpen, saleToEdit, reset, memoizedDefaultValues, inventoryLots]);


  const quantity = watch("quantity");
  const netWeight = watch("netWeight");
  const rate = watch("rate");
  const cutAmountInput = watch("cutAmount"); 
  const cutBill = watch("cutBill");
  const transportCostInput = watch("transportCost") || 0;
  const selectedBrokerId = watch("brokerId");
  const brokerageType = watch("brokerageType");
  const brokerageValue = watch("brokerageValue");
  const extraBrokeragePerKg = watch("extraBrokeragePerKg") || 0;
  const watchedLotNumber = watch("lotNumber");


  React.useEffect(() => {
    if (typeof quantity === 'number' && quantity >= 0 && !netWeightManuallySet) {
      setValue("netWeight", quantity * 50, { shouldValidate: true });
    }
  }, [quantity, setValue, netWeightManuallySet]);

  React.useEffect(() => {
    if (watchedLotNumber) {
      const selectedPurchase = inventoryLots.find(p => p.lotNumber === watchedLotNumber);
      const newPurchaseRate = selectedPurchase?.rate || 0;
      if (newPurchaseRate !== purchaseRateForLot) {
        setPurchaseRateForLot(newPurchaseRate);
      }
    } else {
        if (purchaseRateForLot !== 0) {
          setPurchaseRateForLot(0);
        }
    }
  }, [watchedLotNumber, inventoryLots, purchaseRateForLot]);

  React.useEffect(() => {
    if (watchedLotNumber && existingSales && existingSales.length > 0) {
      const salesForThisLot = existingSales.filter(
        (sale) => sale.lotNumber === watchedLotNumber
      );

      if (salesForThisLot.length > 0) {
        salesForThisLot.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLastSoldRate(salesForThisLot[0].rate);
      } else {
        setLastSoldRate(null);
      }
    } else {
      setLastSoldRate(null);
    }
  }, [watchedLotNumber, existingSales]);


  React.useEffect(() => {
    if (selectedBrokerId && !brokerageValueManuallySet) {
      const brokerDetails = brokers.find(b => b.id === selectedBrokerId);
      if (brokerDetails && brokerDetails.commission !== undefined) {
        setValue("brokerageType", "Percentage", { shouldValidate: true });
        setValue("brokerageValue", brokerDetails.commission, { shouldValidate: true });
      } else if ((!brokerDetails || brokerDetails.commission === undefined) && !brokerageValueManuallySet) {
            setValue("brokerageType", undefined, { shouldValidate: true });
            setValue("brokerageValue", undefined, { shouldValidate: true });
      }
    } else if (!selectedBrokerId && !brokerageValueManuallySet) {
      setValue("brokerageType", undefined);
      setValue("brokerageValue", undefined);
    }
  }, [selectedBrokerId, brokers, setValue, brokerageValueManuallySet]);


  const goodsValueForCalc = React.useMemo(() => {
    const currentNetWeight = parseFloat(String(netWeight || 0));
    const currentRate = parseFloat(String(rate || 0));
    if (isNaN(currentNetWeight) || isNaN(currentRate)) return 0;
    return currentNetWeight * currentRate;
  }, [netWeight, rate]);

  const finalBilledAmountForDisplay = React.useMemo(() => {
    if (cutBill && cutAmountInput !== undefined && cutAmountInput >= 0) {
      return goodsValueForCalc - cutAmountInput;
    }
    return goodsValueForCalc;
  }, [cutBill, cutAmountInput, goodsValueForCalc]);


  const calculatedBrokerageCommission = React.useMemo(() => {
    if (!selectedBrokerId || brokerageValue === undefined || brokerageValue < 0) return 0;
    const baseAmountForBrokerage = goodsValueForCalc; 

    if (brokerageType === "Percentage") {
      return (baseAmountForBrokerage * (brokerageValue / 100));
    } else if (brokerageType === "Fixed") {
      return brokerageValue;
    }
    return 0;
  }, [selectedBrokerId, brokerageType, brokerageValue, goodsValueForCalc]);
  
  const calculatedExtraBrokerage = React.useMemo(() => {
    if (!selectedBrokerId || extraBrokeragePerKg <= 0 || netWeight <= 0) return 0;
    return extraBrokeragePerKg * netWeight;
  }, [selectedBrokerId, extraBrokeragePerKg, netWeight]);

  const costOfGoodsSold = React.useMemo(() => {
    const currentNetWeight = parseFloat(String(netWeight || 0));
    if (isNaN(currentNetWeight) || isNaN(purchaseRateForLot)) return 0;
    return currentNetWeight * purchaseRateForLot;
  }, [netWeight, purchaseRateForLot]);

  const calculatedProfit = React.useMemo(() => {
    return goodsValueForCalc - costOfGoodsSold - transportCostInput - calculatedBrokerageCommission - calculatedExtraBrokerage;
  }, [goodsValueForCalc, costOfGoodsSold, transportCostInput, calculatedBrokerageCommission, calculatedExtraBrokerage]);


  const handleOpenMasterForm = (type: MasterItemType) => {
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem);
    if (masterFormItemType) {
        if (newItem.type === 'Customer') methods.setValue('customerId', newItem.id, { shouldValidate: true });
        if (newItem.type === 'Transporter') methods.setValue('transporterId', newItem.id, { shouldValidate: true });
        if (newItem.type === 'Broker') methods.setValue('brokerId', newItem.id, { shouldValidate: true });
    }
    setIsMasterFormOpen(false);
    setMasterFormItemType(null);
    toast({ title: `${newItem.type} "${newItem.name}" added successfully and selected!` });
  };

  const processSubmit = (values: SaleFormValues) => {
    let submissionValues = { ...values };

    if (!netWeightManuallySet && submissionValues.quantity > 0 && (!submissionValues.netWeight || submissionValues.netWeight === 0)) {
      submissionValues.netWeight = submissionValues.quantity * 50;
    }
    const finalNetWeightForSubmit = submissionValues.netWeight;

    if (!submissionValues.customerId || !submissionValues.lotNumber) {
        toast({ title: "Missing Info", description: "Customer and Lot Number are required.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    const selectedCustomer = customers.find(c => c.id === submissionValues.customerId);
    const selectedBroker = brokers.find(b => b.id === submissionValues.brokerId);
    const selectedTransporter = transporters.find(t => t.id === submissionValues.transporterId);

    const currentGoodsValue = finalNetWeightForSubmit * submissionValues.rate;
    const currentCutAmount = (submissionValues.cutBill && submissionValues.cutAmount !== undefined && submissionValues.cutAmount >= 0)
                                ? submissionValues.cutAmount
                                : undefined;
    const currentBilledAmount = currentCutAmount !== undefined
                                ? currentGoodsValue - currentCutAmount
                                : currentGoodsValue;
    
    const currentCostOfGoodsSold = finalNetWeightForSubmit * purchaseRateForLot;
    
    const brokerageTypeForSubmit = submissionValues.brokerageType;
    const brokerageValueForSubmit = submissionValues.brokerageValue;
    const currentBrokerageCommission = (submissionValues.brokerId && brokerageValueForSubmit !== undefined && brokerageValueForSubmit >= 0) ?
      (brokerageTypeForSubmit === "Percentage" ? (currentGoodsValue * (brokerageValueForSubmit / 100)) : brokerageValueForSubmit)
      : 0;

    const currentExtraBrokerageAmount = (submissionValues.brokerId && submissionValues.extraBrokeragePerKg && submissionValues.extraBrokeragePerKg > 0)
        ? submissionValues.extraBrokeragePerKg * finalNetWeightForSubmit
        : 0;
    
    const currentProfit = currentGoodsValue - currentCostOfGoodsSold - (submissionValues.transportCost || 0) - currentBrokerageCommission - currentExtraBrokerageAmount;

    const saleData: Sale = {
      id: saleToEdit?.id || `sale-${Date.now()}`,
      date: format(submissionValues.date, "yyyy-MM-dd"),
      billNumber: submissionValues.billNumber,
      cutBill: submissionValues.cutBill,
      cutAmount: currentCutAmount,
      goodsValue: currentGoodsValue,
      billedAmount: currentBilledAmount,
      customerId: submissionValues.customerId as string,
      customerName: selectedCustomer?.name,
      brokerId: submissionValues.brokerId,
      brokerName: selectedBroker?.name,
      lotNumber: submissionValues.lotNumber as string,
      quantity: submissionValues.quantity,
      netWeight: finalNetWeightForSubmit,
      rate: submissionValues.rate,
      transporterId: submissionValues.transporterId,
      transporterName: selectedTransporter?.name,
      transportCost: submissionValues.transportCost,
      brokerageType: submissionValues.brokerageType,
      brokerageValue: submissionValues.brokerageValue,
      extraBrokeragePerKg: submissionValues.extraBrokeragePerKg,
      calculatedBrokerageCommission: currentBrokerageCommission,
      calculatedExtraBrokerage: currentExtraBrokerageAmount,
      notes: submissionValues.notes,
      calculatedProfit: currentProfit,
    };
    onSubmit(saleData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  const availableLotsForDropdown = React.useMemo(() => {
    return inventoryLots
      .map(p => {
        const salesForThisLot = existingSales.filter(s => s.lotNumber === p.lotNumber && s.id !== saleToEdit?.id);
        const bagsSoldFromLot = salesForThisLot.reduce((sum, s) => sum + (s.quantity || 0), 0);
        const availableBags = (p.quantity || 0) - bagsSoldFromLot;
        return {
          value: p.lotNumber,
          label: `${p.lotNumber} (Avl: ${availableBags} bags, Rate: ₹${p.rate.toFixed(2)}/kg)`,
          tooltipContent: `Effective Purchase Rate: ₹${p.effectiveRate?.toFixed(2) || 'N/A'}/kg. Location: ${p.locationName || p.locationId}`,
          isAvailable: availableBags > 0,
        };
      }).filter(opt => opt.isAvailable || opt.value === watchedLotNumber );
  }, [inventoryLots, existingSales, saleToEdit, watchedLotNumber]);

  return (
    <>
      <Dialog modal={true} open={isOpen && !isMasterFormOpen} onOpenChange={(openState) => { 
          if (!openState && isOpen) { 
            onClose();
          }
        }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{saleToEdit ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
            <DialogDescription>Enter the details for the sale record.</DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}>
              <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
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
                     <FormField control={control} name="cutAmount" render={({ field }) => (
                      <FormItem><FormLabel>Cut Amount (Reduction ₹)</FormLabel> 
                      <FormControl><Input type="number" step="0.01" placeholder="Enter reduction amount" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} disabled={!watch("cutBill")} /></FormControl>
                      <FormMessage /></FormItem>)}
                    />
                  </div>
                   <FormField control={control} name="cutBill" render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 mt-4 pt-4 border-t">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="font-normal cursor-pointer mt-0!">
                              Is this a "Cut Bill"? (Apply reduction to invoice amount)
                            </FormLabel>
                          <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Product &amp; Customer</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={control} name="lotNumber" render={({ field }) => (
                      <FormItem><FormLabel>Vakkal / Lot Number (Mumbai)</FormLabel>
                      <MasterDataCombobox
                        value={field.value}
                        onChange={field.onChange}
                        options={availableLotsForDropdown}
                        placeholder="Select Lot"
                        searchPlaceholder="Search lots..."
                        notFoundMessage="Lot not found or out of stock in Mumbai."
                      />
                      <FormMessage /></FormItem>)}
                    />
                    <FormField control={control} name="customerId" render={({ field }) => (
                      <FormItem><FormLabel>Customer</FormLabel>
                      <MasterDataCombobox
                        value={field.value}
                        onChange={field.onChange}
                        options={customers.map(c => ({ value: c.id, label: c.name, tooltipContent: `Type: ${c.type}` }))}
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
                              const val = parseFloat(e.target.value) || 0;
                              field.onChange(val);
                              setNetWeightManuallySet(false);
                            }}
                            onFocusCapture={() => setNetWeightManuallySet(false)}
                          /></FormControl><FormMessage /></FormItem>)}
                      />
                     <FormField control={control} name="netWeight" render={({ field }) => (
                          <FormItem><FormLabel>Net Weight (kg)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 2500" {...field} value={field.value || ''}
                            onChange={e => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              setNetWeightManuallySet(true);
                            }}
                            onFocusCapture={() => setNetWeightManuallySet(true)}
                          /></FormControl><FormMessage /></FormItem>)}
                      />
                      <FormField control={control} name="rate" render={({ field }) => (
                          <FormItem>
                          <FormLabel>Sale Rate (₹/kg)</FormLabel>
                          {lastSoldRate !== null && <p className="text-xs text-muted-foreground">Last sold this lot: ₹{lastSoldRate.toFixed(2)}/kg</p>}

                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 25.50" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)}
                      />
                  </div>
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Transport &amp; Broker (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                      <FormField control={control} name="transporterId" render={({ field }) => (
                          <FormItem><FormLabel>Transporter</FormLabel>
                          <MasterDataCombobox
                            value={field.value}
                            onChange={field.onChange}
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
                            value={field.value}
                            onChange={field.onChange}
                            options={brokers.map(b => ({ value: b.id, label: b.name, tooltipContent: `Commission: ${b.commission || 0}%` }))}
                            placeholder="Select Broker"
                            searchPlaceholder="Search brokers..."
                            notFoundMessage="Broker not found."
                            addNewLabel="Add New Broker"
                            onAddNew={() => handleOpenMasterForm("Broker")}
                          />
                          <FormMessage /></FormItem>)}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <FormField control={control} name="brokerageType" render={({ field }) => (
                              <FormItem className="sm:col-span-1"><FormLabel>Brokerage Type</FormLabel>
                              <ShadSelect onValueChange={(value) => { field.onChange(value); setBrokerageValueManuallySet(false);}} value={field.value} disabled={!selectedBrokerId}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger></FormControl>
                                  <SelectContent><SelectItem value="Fixed">Fixed (₹)</SelectItem><SelectItem value="Percentage">%</SelectItem></SelectContent>
                              </ShadSelect><FormMessage /></FormItem>)}
                          />
                          <FormField control={control} name="brokerageValue" render={({ field }) => (
                              <FormItem className="sm:col-span-1"><FormLabel>Brokerage Value</FormLabel>
                              <div className="relative">
                                  <FormControl><Input
                                    type="number" step="0.01" placeholder="Value" {...field}
                                    value={field.value ?? ''}
                                    onChange={e => { field.onChange(parseFloat(e.target.value) || undefined); setBrokerageValueManuallySet(true); }}
                                    onFocusCapture={() => setBrokerageValueManuallySet(true)}
                                    disabled={!selectedBrokerId || !brokerageType} className={brokerageType === 'Percentage' ? "pr-8" : ""}/></FormControl>
                                  {brokerageType === 'Percentage' && <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                              </div>
                              <FormMessage /></FormItem>)}
                          />
                          <FormField control={control} name="extraBrokeragePerKg" render={({ field }) => (
                              <FormItem className="sm:col-span-1"><FormLabel>Extra ₹ (per kg)</FormLabel>
                               <FormControl><Input
                                  type="number" step="0.01" placeholder="Extra per kg" {...field}
                                  value={field.value ?? ''}
                                  onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                                  disabled={!selectedBrokerId}/></FormControl>
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
                            Actual Goods Value:
                        </div>
                        <p className="text-lg font-bold text-foreground">
                        ₹{goodsValueForCalc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    {cutBill && cutAmountInput !== undefined && cutAmountInput >=0 && (
                       <div className="flex items-center justify-between text-sm text-destructive">
                            <span>Less: Cut Amount (Reduction):</span>
                            <span className="font-semibold">
                                (-) ₹{cutAmountInput.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}
                     <div className="flex items-center justify-between border-t pt-2 mt-2">
                        <div className="text-md font-semibold text-primary">
                            Final Billed Amount for Customer:
                        </div>
                        <p className="text-xl font-bold text-primary">
                        ₹{finalBilledAmountForDisplay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>


                    <div className="text-sm text-muted-foreground pl-7 space-y-1 pt-2 border-t mt-2">
                        <div className="flex justify-between">
                          <span>Less: Cost of Goods Sold:</span> 
                          <span className="font-semibold">₹{costOfGoodsSold.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-xs pl-2">
                           (Est. Purchase Rate: ₹{purchaseRateForLot.toFixed(2)}/kg × Net Weight: { (parseFloat(String(netWeight || 0))).toFixed(2)} kg)
                        </div>
                        {transportCostInput > 0 && (
                            <div className="flex justify-between"><span>Less: Transport Cost:</span> <span className="font-semibold">₹{transportCostInput.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        )}
                        {calculatedBrokerageCommission > 0 && (
                            <div className="flex justify-between"><span>Less: Brokerage (% or Fixed):</span> <span className="font-semibold">₹{calculatedBrokerageCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        )}
                         {calculatedExtraBrokerage > 0 && (
                            <div className="flex justify-between"><span>Less: Extra Brokerage (₹/kg):</span> <span className="font-semibold">₹{calculatedExtraBrokerage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        )}
                        <hr className="my-1 border-muted-foreground/50" />
                        <div className={`flex justify-between font-bold ${calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <span>Estimated Net Profit (on Goods Value):</span> <span>₹{calculatedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
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

export const AddSaleForm = React.memo(AddSaleFormComponent);
