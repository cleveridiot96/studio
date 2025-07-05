
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
  FormDescription,
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

interface AggregatedStockItemForForm {
  lotNumber: string;
  locationId: string;
  currentBags: number;
  currentWeight: number;
  purchaseRate: number;
  effectiveRate: number;
  locationName?: string;
}

interface AddSaleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sale: Sale) => void;
  customers: Customer[];
  transporters: Transporter[];
  brokers: Broker[];
  availableStock: AggregatedStockItemForForm[];
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
  availableStock,
  existingSales,
  onMasterDataUpdate,
  saleToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<MasterItemType | null>(null);

  const [netWeightManuallySet, setNetWeightManuallySet] = React.useState(!!saleToEdit?.netWeight);
  const [brokerageValueManuallySet, setBrokerageValueManuallySet] = React.useState(!!saleToEdit?.brokerageValue);
  
  const [purchaseRateForLot, setPurchaseRateForLot] = React.useState<number>(0);
  const [effectiveRateForLot, setEffectiveRateForLot] = React.useState<number>(0);
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
        packingCost: saleToEdit.packingCost === undefined || saleToEdit.packingCost === null ? undefined : saleToEdit.packingCost,
        labourCost: saleToEdit.labourCost === undefined || saleToEdit.labourCost === null ? undefined : saleToEdit.labourCost,
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
      packingCost: undefined,
      labourCost: undefined,
      brokerId: undefined,
      brokerageType: undefined,
      brokerageValue: undefined,
      extraBrokeragePerKg: undefined,
      notes: "",
    };
  }, [saleToEdit]);

  const memoizedDefaultValues = React.useMemo(() => getDefaultValues(), [getDefaultValues]);

  const memoizedSaleSchema = React.useMemo(() =>
    saleSchema(customers, transporters, brokers, availableStock, existingSales, saleToEdit?.id)
  , [customers, transporters, brokers, availableStock, existingSales, saleToEdit]);

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
        const originalStock = availableStock.find(p => p.lotNumber === saleToEdit.lotNumber);
        setPurchaseRateForLot(originalStock?.purchaseRate || 0);
        setEffectiveRateForLot(originalStock?.effectiveRate || originalStock?.purchaseRate || 0);
      } else {
        setPurchaseRateForLot(0);
        setEffectiveRateForLot(0);
      }
    }
  }, [isOpen, saleToEdit, reset, memoizedDefaultValues, availableStock]);


  const quantity = watch("quantity");
  const netWeight = watch("netWeight");
  const rate = watch("rate");
  const cutAmountInput = watch("cutAmount"); 
  const cutBill = watch("cutBill");
  const transportCostInput = watch("transportCost") || 0;
  const packingCostInput = watch("packingCost") || 0;
  const labourCostInput = watch("labourCost") || 0;
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
        const selectedStock = availableStock.find(p => p.lotNumber === watchedLotNumber);
        const newPurchaseRate = selectedStock?.purchaseRate || 0;
        const newEffectiveRate = selectedStock?.effectiveRate || newPurchaseRate;
        setPurchaseRateForLot(newPurchaseRate);
        setEffectiveRateForLot(newEffectiveRate);
    } else {
        setPurchaseRateForLot(0);
        setEffectiveRateForLot(0);
    }
  }, [watchedLotNumber, availableStock]);


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
    if (isNaN(currentNetWeight) || isNaN(effectiveRateForLot)) return 0;
    return currentNetWeight * effectiveRateForLot;
  }, [netWeight, effectiveRateForLot]);

  const grossProfit = React.useMemo(() => {
    return goodsValueForCalc - costOfGoodsSold;
  }, [goodsValueForCalc, costOfGoodsSold]);

  const calculatedProfit = React.useMemo(() => {
    const totalExpenses = costOfGoodsSold + transportCostInput + packingCostInput + labourCostInput + calculatedBrokerageCommission + calculatedExtraBrokerage;
    return finalBilledAmountForDisplay - totalExpenses;
  }, [finalBilledAmountForDisplay, costOfGoodsSold, transportCostInput, packingCostInput, labourCostInput, calculatedBrokerageCommission, calculatedExtraBrokerage]);


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
    
    const currentCostOfGoodsSold = finalNetWeightForSubmit * effectiveRateForLot;
    
    const brokerageTypeForSubmit = submissionValues.brokerageType;
    const brokerageValueForSubmit = submissionValues.brokerageValue;
    const currentBrokerageCommission = (submissionValues.brokerId && brokerageValueForSubmit !== undefined && brokerageValueForSubmit >= 0) ?
      (brokerageTypeForSubmit === "Percentage" ? (currentGoodsValue * (brokerageValueForSubmit / 100)) : brokerageValueForSubmit)
      : 0;

    const currentExtraBrokerageAmount = (submissionValues.brokerId && submissionValues.extraBrokeragePerKg && submissionValues.extraBrokeragePerKg > 0)
        ? submissionValues.extraBrokeragePerKg * finalNetWeightForSubmit
        : 0;
    
    const allSaleExpenses = (submissionValues.transportCost || 0) + (submissionValues.packingCost || 0) + (submissionValues.labourCost || 0) + currentBrokerageCommission + currentExtraBrokerageAmount;
    const currentProfit = currentBilledAmount - currentCostOfGoodsSold - allSaleExpenses;


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
      packingCost: submissionValues.packingCost,
      labourCost: submissionValues.labourCost,
      brokerageType: submissionValues.brokerageType,
      brokerageValue: submissionValues.brokerageValue,
      extraBrokeragePerKg: submissionValues.extraBrokeragePerKg,
      calculatedBrokerageCommission: currentBrokerageCommission,
      calculatedExtraBrokerage: currentExtraBrokerageAmount,
      notes: submissionValues.notes,
      calculatedProfit: currentProfit,
      costOfGoodsSold: currentCostOfGoodsSold,
    };
    onSubmit(saleData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  const availableLotsForDropdown = React.useMemo(() => {
    return availableStock
      .map(p => {
        const availableBags = p.currentBags;
        const rateDisplay = typeof p.purchaseRate === 'number' ? p.purchaseRate.toFixed(2) : 'N/A';
        
        let tooltipForLot = `Purchase Rate: ₹${rateDisplay}/kg.`;
        if (p.locationName) {
            tooltipForLot += ` Location: ${p.locationName}`;
        }

        return {
          value: p.lotNumber,
          label: `${p.lotNumber} (Avl: ${availableBags} bags, Rate: ₹${p.purchaseRate.toFixed(2)})`,
          tooltipContent: tooltipForLot,
          isAvailable: availableBags > 0,
        };
      }).filter(opt => opt.isAvailable || opt.value === watchedLotNumber );
  }, [availableStock, watchedLotNumber]);

  return (
    <>
      <Dialog modal={true} open={isOpen && !isMasterFormOpen} onOpenChange={(openState) => { 
          if (!openState && isOpen) { 
            onClose();
          }
        }}>
        <DialogContent className="sm:max-w-4xl">
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
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                          <PopoverTrigger asChild><FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
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
                        placeholder="Select Lot from Mumbai"
                        searchPlaceholder="Search lots..."
                        notFoundMessage="Lot not available in Mumbai warehouse."
                      />
                      <FormDescription>
                        Only stock from the Mumbai warehouse is available for sale. Use 'Location Transfer' to move stock.
                      </FormDescription>
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
                  <h3 className="text-lg font-medium mb-3 text-primary">Expenses &amp; Broker (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4">
                      <FormField control={control} name="transporterId" render={({ field }) => (
                          <FormItem><FormLabel>Transporter</FormLabel>
                          <MasterDataCombobox
                            value={field.value}
                            onChange={field.onChange}
                            options={transporters.filter(t => t.type === 'Transporter').map(t => ({ value: t.id, label: t.name }))}
                            placeholder="Select Transporter"
                            searchPlaceholder="Search transporters..."
                            notFoundMessage="Transporter not found."
                            addNewLabel="Add New Transporter"
                            onAddNew={() => handleOpenMasterForm("Transporter")}
                          />
                          <FormMessage /></FormItem>)}
                      />
                      <FormField control={control} name="transportCost" render={({ field }) => (
                          <FormItem><FormLabel>Transport (₹)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 500" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)}
                      />
                       <FormField control={control} name="packingCost" render={({ field }) => (
                          <FormItem><FormLabel>Packing (₹)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 150" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)}
                      />
                       <FormField control={control} name="labourCost" render={({ field }) => (
                          <FormItem><FormLabel>Labour (₹)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="e.g., 100" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)}
                      />
                  </div>
                  {/* Brokerage Section */}
                  <div className="border-t pt-4 mt-4">
                     <FormField control={control} name="brokerId" render={({ field }) => (
                          <FormItem className="lg:col-span-2"><FormLabel>Broker</FormLabel>
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
                      {selectedBrokerId && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
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
                                <FormItem className="sm:col-span-1"><FormLabel>Extra (₹/kg)</FormLabel>
                                 <FormControl><Input
                                    type="number" step="0.01" placeholder="Extra per kg" {...field}
                                    value={field.value ?? ''}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                                    disabled={!selectedBrokerId}/></FormControl>
                                <FormMessage /></FormItem>)}
                            />
                        </div>
                      )}
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
                     <div className="flex items-center justify-between border-b pb-2 mb-2">
                        <div className="text-md font-semibold text-primary">
                            Final Billed Amount:
                        </div>
                        <p className="text-xl font-bold text-primary">
                        ₹{finalBilledAmountForDisplay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                       <div className="flex justify-between">
                          <span>Less: Cost of Goods (Landed):</span> 
                          <span className="font-semibold">₹{costOfGoodsSold.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-xs pl-2">
                           (Landed Cost Rate: ₹{effectiveRateForLot.toFixed(2)}/kg × Net Weight: { (parseFloat(String(netWeight || 0))).toFixed(2)} kg)
                        </div>
                        
                        <div className={`flex justify-between font-bold ${grossProfit >= 0 ? 'text-cyan-600' : 'text-orange-600'}`}>
                            <span>Gross Profit (before expenses):</span> <span>₹{grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {(transportCostInput > 0 || packingCostInput > 0 || labourCostInput > 0 || calculatedBrokerageCommission > 0 || calculatedExtraBrokerage > 0) && (
                            <hr className="my-1 border-muted-foreground/50" />
                        )}

                        {transportCostInput > 0 && (
                            <div className="flex justify-between"><span>Less: Transport Cost:</span> <span className="font-semibold">₹{transportCostInput.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        )}
                         {packingCostInput > 0 && (
                            <div className="flex justify-between"><span>Less: Packing Cost:</span> <span className="font-semibold">₹{packingCostInput.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        )}
                         {labourCostInput > 0 && (
                            <div className="flex justify-between"><span>Less: Labour Cost:</span> <span className="font-semibold">₹{labourCostInput.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        )}
                        {calculatedBrokerageCommission > 0 && (
                            <div className="flex justify-between"><span>Less: Brokerage:</span> <span className="font-semibold">₹{calculatedBrokerageCommission.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        )}
                         {calculatedExtraBrokerage > 0 && (
                            <div className="flex justify-between"><span>Less: Extra Brokerage (Mera):</span> <span className="font-semibold">₹{calculatedExtraBrokerage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                        )}
                        <hr className="my-1 border-muted-foreground/50" />
                        <div className={`flex justify-between font-bold ${calculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <span>Estimated Net Profit:</span> <span>₹{calculatedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
