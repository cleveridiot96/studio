
"use client";

import * as React from "react";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
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
import { CalendarIcon, Info, Percent, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { saleSchema, type SaleFormValues } from '@/lib/schemas/saleSchema';
import type { MasterItem, MasterItemType, Sale, SaleItem, Broker, Customer, Transporter } from '@/lib/types';
import type { AggregatedStockItemForForm } from "./SalesClient";
import { MasterDataCombobox } from '@/components/shared/MasterDataCombobox';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MasterForm } from '@/components/app/masters/MasterForm';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

  const getDefaultValues = React.useCallback((): SaleFormValues => {
    if (saleToEdit) {
      return {
        date: new Date(saleToEdit.date),
        customerId: saleToEdit.customerId,
        brokerId: saleToEdit.brokerId || undefined,
        items: saleToEdit.items.map(item => ({
            lotNumber: item.lotNumber,
            quantity: item.quantity,
            netWeight: item.netWeight,
            rate: item.rate
        })),
        isCB: saleToEdit.isCB || false,
        cbAmount: saleToEdit.cbAmount,
        billNumber: saleToEdit.billNumber || "",
        transporterId: saleToEdit.transporterId || undefined,
        transportCost: saleToEdit.transportCost,
        packingCost: saleToEdit.packingCost,
        labourCost: saleToEdit.labourCost,
        brokerageType: saleToEdit.brokerageType,
        brokerageValue: saleToEdit.brokerageValue,
        extraBrokeragePerKg: saleToEdit.extraBrokeragePerKg,
        notes: saleToEdit.notes || "",
      };
    }
    return {
      date: new Date(),
      customerId: undefined,
      brokerId: undefined,
      items: [{ lotNumber: "", quantity: undefined, netWeight: undefined, rate: undefined }],
      isCB: false,
      cbAmount: undefined,
      billNumber: "",
      transporterId: undefined,
      transportCost: undefined,
      packingCost: undefined,
      labourCost: undefined,
      brokerageType: undefined,
      brokerageValue: undefined,
      extraBrokeragePerKg: undefined,
      notes: "",
    };
  }, [saleToEdit]);

  const memoizedSaleSchema = React.useMemo(() =>
    saleSchema(customers, transporters, brokers, availableStock, existingSales, saleToEdit?.id)
  , [customers, transporters, brokers, availableStock, existingSales, saleToEdit]);

  const methods = useForm<SaleFormValues>({
    resolver: zodResolver(memoizedSaleSchema),
    defaultValues: getDefaultValues(),
  });
  const { control, watch, reset, setValue, handleSubmit, formState: { errors } } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
    }
  }, [isOpen, saleToEdit, reset, getDefaultValues]);

  const selectedBrokerId = watch("brokerId");

  React.useEffect(() => {
    if (selectedBrokerId) {
      const broker = brokers.find(b => b.id === selectedBrokerId);
      if (broker && typeof broker.commission === 'number' && broker.commission >= 0) {
        setValue("brokerageType", "Percentage", { shouldValidate: true });
        setValue("brokerageValue", broker.commission, { shouldValidate: true });
      } else {
        setValue("brokerageType", undefined);
        setValue("brokerageValue", undefined);
      }
    } else {
      setValue("brokerageType", undefined);
      setValue("brokerageValue", undefined);
    }
  }, [selectedBrokerId, brokers, setValue]);

  // --- LIVE CALCULATIONS ---
  // Watching the entire items array to trigger recalculation on any nested change.
  const watchedItems = watch("items");
  const isCB = watch("isCB");
  const cbAmountInput = watch("cbAmount") || 0; 
  const transportCostInput = watch("transportCost") || 0;
  const packingCostInput = watch("packingCost") || 0;
  const labourCostInput = watch("labourCost") || 0;
  
  const brokerageType = watch("brokerageType");
  const brokerageValue = watch("brokerageValue");
  const extraBrokeragePerKg = watch("extraBrokeragePerKg") || 0;

  const {
    totalGoodsValue,
    totalNetWeight,
    totalQuantity,
    totalLandedCost, // This is based on effectiveRate for Net Profit
    totalGrossPurchaseCost, // This is based on raw purchaseRate for Gross Profit
  } = React.useMemo(() => {
    return (watchedItems || []).reduce(
      (acc, item) => {
        const itemQuantity = Number(item.quantity) || 0;
        const itemNetWeight = Number(item.netWeight) || 0;
        const itemRate = Number(item.rate) || 0;
        const stockInfo = availableStock.find(s => s.lotNumber === item.lotNumber);
        
        const rawPurchaseRate = stockInfo?.purchaseRate || 0; 
        const landedCostPerKg = stockInfo?.effectiveRate || 0;

        acc.totalGoodsValue += itemNetWeight * itemRate;
        acc.totalNetWeight += itemNetWeight;
        acc.totalQuantity += itemQuantity;
        
        acc.totalGrossPurchaseCost += itemNetWeight * rawPurchaseRate;
        acc.totalLandedCost += itemNetWeight * landedCostPerKg;

        return acc;
      },
      { totalGoodsValue: 0, totalNetWeight: 0, totalQuantity: 0, totalLandedCost: 0, totalGrossPurchaseCost: 0 }
    );
  }, [watchedItems, availableStock]);

  const billedAmount = isCB ? totalGoodsValue - cbAmountInput : totalGoodsValue;

  const calculatedBrokerageCommission = (() => {
    if (!selectedBrokerId || brokerageValue === undefined || brokerageValue < 0) return 0;
    if (brokerageType === "Percentage") return (totalGoodsValue * (brokerageValue / 100));
    if (brokerageType === "Fixed") return brokerageValue;
    return 0;
  })();

  const calculatedExtraBrokerage = extraBrokeragePerKg * totalNetWeight;
  const totalSaleSideExpenses = transportCostInput + packingCostInput + labourCostInput + calculatedBrokerageCommission + calculatedExtraBrokerage;
  const additionalLandedCosts = totalLandedCost - totalGrossPurchaseCost;

  const grossProfit = totalGoodsValue - totalGrossPurchaseCost;
  const finalNetProfit = grossProfit - additionalLandedCosts - totalSaleSideExpenses;

  const handleOpenMasterForm = (type: MasterItemType) => {
    setIsMasterFormOpen(true);
    setMasterFormItemType(type);
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem);
    if (newItem.type === 'Customer') methods.setValue('customerId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Transporter') methods.setValue('transporterId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Broker') {
        methods.setValue('brokerId', newItem.id, { shouldValidate: true });
        if (typeof newItem.commission === 'number') {
            methods.setValue('brokerageType', 'Percentage');
            methods.setValue('brokerageValue', newItem.commission);
        }
    }
    setIsMasterFormOpen(false); setMasterFormItemType(null);
    toast({ title: `${newItem.type} added and selected.` });
  };

  const processSubmit = (values: SaleFormValues) => {
    setIsSubmitting(true);
    const selectedCustomer = customers.find(c => c.id === values.customerId);
    const selectedBroker = brokers.find(b => b.id === values.brokerId);
    const selectedTransporter = transporters.find(t => t.id === values.transporterId);

    const saleData: Sale = {
      id: saleToEdit?.id || `sale-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      billNumber: values.billNumber,
      isCB: values.isCB,
      cbAmount: values.cbAmount,
      customerId: values.customerId,
      customerName: selectedCustomer?.name,
      brokerId: values.brokerId,
      brokerName: selectedBroker?.name,
      items: values.items.map(item => {
          const stock = availableStock.find(s => s.lotNumber === item.lotNumber);
          const itemGoodsValue = (item.netWeight || 0) * (item.rate || 0);
          const itemCOGS = (item.netWeight || 0) * (stock?.effectiveRate || 0);

          const itemProportionOfGoods = totalGoodsValue > 0 ? itemGoodsValue / totalGoodsValue : 0;
          const apportionedExpenses = totalSaleSideExpenses * itemProportionOfGoods;
          const itemNetProfit = itemGoodsValue - itemCOGS - apportionedExpenses;

          return {
              lotNumber: item.lotNumber,
              quantity: item.quantity || 0,
              netWeight: item.netWeight || 0,
              rate: item.rate || 0,
              goodsValue: itemGoodsValue,
              costOfGoodsSold: itemCOGS,
              itemProfit: itemNetProfit,
          };
      }),
      totalGoodsValue: totalGoodsValue,
      billedAmount: billedAmount,
      totalQuantity: totalQuantity,
      totalNetWeight: totalNetWeight,
      totalCostOfGoodsSold: totalLandedCost, // Use landed cost here
      transporterId: values.transporterId,
      transporterName: selectedTransporter?.name,
      transportCost: values.transportCost,
      packingCost: values.packingCost,
      labourCost: values.labourCost,
      brokerageType: values.brokerageType,
      brokerageValue: values.brokerageValue,
      extraBrokeragePerKg: values.extraBrokeragePerKg,
      calculatedBrokerageCommission: calculatedBrokerageCommission,
      calculatedExtraBrokerage: calculatedExtraBrokerage,
      notes: values.notes,
      totalCalculatedProfit: finalNetProfit,
    };
    onSubmit(saleData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <TooltipProvider>
        <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(openState) => { if (!openState) { onClose(); } }}>
          <DialogContent className="sm:max-w-6xl">
            <DialogHeader>
              <DialogTitle>{saleToEdit ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
              <DialogDescription>Create a sale with one or more items.</DialogDescription>
            </DialogHeader>
            <FormProvider {...methods}>
              <Form {...methods}>
                <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
                  
                  <div className="p-4 border rounded-md shadow-sm">
                    <h3 className="text-lg font-medium mb-3 text-primary">Sale Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Sale Date</FormLabel>
                          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}><PopoverTrigger asChild><FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsDatePickerOpen(false); }} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                          </Popover><FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name="customerId" render={({ field }) => (
                        <FormItem><FormLabel>Customer</FormLabel>
                          <MasterDataCombobox value={field.value} onChange={field.onChange} options={customers.map(c => ({ value: c.id, label: c.name }))} placeholder="Select Customer" onAddNew={() => handleOpenMasterForm("Customer")} /> <FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name="brokerId" render={({ field }) => (
                        <FormItem><FormLabel>Broker (Optional)</FormLabel>
                          <MasterDataCombobox value={field.value} onChange={field.onChange} options={brokers.map(b => ({ value: b.id, label: b.name }))} placeholder="Select Broker" onAddNew={() => handleOpenMasterForm("Broker")} /> <FormMessage />
                        </FormItem>)} />
                    </div>
                  </div>

                  <div className="p-4 border rounded-md shadow-sm">
                    <h3 className="text-lg font-medium text-primary">Quantity & Rate</h3>
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 border-b last:border-b-0">
                        <FormField control={control} name={`items.${index}.lotNumber`} render={({ field: itemField }) => (
                          <FormItem className="md:col-span-5"><FormLabel>Vakkal/Lot</FormLabel>
                            <MasterDataCombobox 
                              value={itemField.value} 
                              onChange={(lotValue) => {
                                itemField.onChange(lotValue);
                                const currentBags = watch(`items.${index}.quantity`);
                                if (currentBags && currentBags > 0) {
                                    const stockItem = availableStock.find(s => s.lotNumber === lotValue);
                                    const avgWeight = stockItem?.averageWeightPerBag || 50;
                                    setValue(`items.${index}.netWeight`, parseFloat((currentBags * avgWeight).toFixed(2)), { shouldValidate: true });
                                }
                              }} 
                              options={availableStock.map(s => {
                                  return {
                                      value: s.lotNumber,
                                      label: `${s.lotNumber} (Avl: ${s.currentBags} bags)`,
                                      tooltipContent: `Purch Rate: ₹${s.purchaseRate.toFixed(2)} | Landed Cost: ₹${s.effectiveRate.toFixed(2)} | Avl: ${s.currentBags} bags at ${s.locationName || 'MUMBAI'}`
                                  };
                              })} 
                              placeholder="Select Lot" />
                            <FormMessage />
                          </FormItem>)} />
                        <FormField control={control} name={`items.${index}.quantity`} render={({ field: itemField }) => (
                          <FormItem className="md:col-span-2"><FormLabel>Bags</FormLabel>
                            <FormControl><Input type="number" placeholder="Bags" {...itemField} value={itemField.value ?? ''}
                              onChange={e => {
                                  const bagsVal = parseFloat(e.target.value) || undefined;
                                  itemField.onChange(bagsVal);
                                  const currentLotNumber = watch(`items.${index}.lotNumber`);
                                  const stockItem = availableStock.find(s => s.lotNumber === currentLotNumber);
                                  const avgWeight = stockItem?.averageWeightPerBag || 50;
                                  setValue(`items.${index}.netWeight`, parseFloat(((bagsVal || 0) * avgWeight).toFixed(2)), { shouldValidate: true });
                              }} 
                             /></FormControl>
                            <FormMessage />
                          </FormItem>)} />
                        <FormField control={control} name={`items.${index}.netWeight`} render={({ field: itemField }) => (
                          <FormItem className="md:col-span-2"><FormLabel>Net Wt.</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Kg" {...itemField} value={itemField.value ?? ''} 
                              onChange={e => itemField.onChange(parseFloat(e.target.value) || undefined)}
                          /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={control} name={`items.${index}.rate`} render={({ field: itemField }) => (
                          <FormItem className="md:col-span-2"><FormLabel>Sale Rate</FormLabel><FormControl><Input type="number" step="0.01" placeholder="₹/kg" {...itemField} value={itemField.value ?? ''} onChange={e => itemField.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="md:col-span-1 flex items-end justify-end"><Button type="button" variant="destructive" size="icon" onClick={() => fields.length > 1 ? remove(index) : null} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button></div>
                      </div>
                    ))}
                    <div className="flex justify-between items-start mt-2">
                      <Button type="button" variant="outline" onClick={() => append({ lotNumber: "", quantity: undefined, netWeight: undefined, rate: undefined })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                      {(totalGoodsValue > 0 || totalNetWeight > 0) && (
                        <div className="w-full md:w-1/2 lg:w-1/3 space-y-1 text-sm p-3 bg-muted/50 rounded-md">
                            <div className="flex justify-between font-semibold">
                                <span>Total Goods Value:</span>
                                <span>₹{totalGoodsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Total Net Weight:</span>
                                <span>{totalNetWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg</span>
                            </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border rounded-md shadow-sm">
                    <h3 className="text-lg font-medium mb-3 text-primary">Billing & Expenses</h3>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <FormField control={control} name="billNumber" render={({ field }) => (
                        <FormItem><FormLabel>Bill Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., INV-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                      <div className="flex items-center space-x-2 pt-6">
                        <FormField control={control} name="isCB" render={({ field }) => (
                          <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="isCB-checkbox" /></FormControl><FormLabel htmlFor="isCB-checkbox" className="!mt-0">CB (Cut Bill)</FormLabel></FormItem>)} />
                        {isCB && <FormField control={control} name="cbAmount" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="number" step="0.01" placeholder="CB Amount" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-md shadow-sm">
                      <h3 className="text-lg font-medium mb-3 text-primary">Expenses &amp; Brokerage</h3>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                         <FormField control={control} name="transporterId" render={({ field }) => (
                          <FormItem className="col-span-full sm:col-span-2"><FormLabel>Transporter</FormLabel>
                            <MasterDataCombobox value={field.value} onChange={field.onChange} 
                              options={transporters.filter(t => t.type === 'Transporter').map((t) => ({ value: t.id, label: t.name }))}
                              placeholder="Select Transporter" addNewLabel="Add New Transporter" onAddNew={() => handleOpenMasterForm("Transporter")}
                            /> <FormMessage />
                          </FormItem>)} />
                         <FormField control={control} name="transportCost" render={({ field }) => (<FormItem><FormLabel>Transport (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 5000" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={control} name="packingCost" render={({ field }) => (<FormItem><FormLabel>Packing (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 500" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={control} name="labourCost" render={({ field }) => (<FormItem><FormLabel>Labour (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 300" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                       </div>
                       {selectedBrokerId && (
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t items-end">
                            <FormField control={control} name="brokerageType" render={({ field }) => (
                              <FormItem><FormLabel>Brokerage Type</FormLabel>
                                <ShadSelect onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="Fixed">Fixed (₹)</SelectItem>
                                    <SelectItem value="Percentage">%</SelectItem>
                                  </SelectContent>
                                </ShadSelect><FormMessage />
                              </FormItem>)} />
                            <FormField control={control} name="brokerageValue" render={({ field }) => (
                              <FormItem><FormLabel>Value</FormLabel>
                                <div className="relative">
                                  <FormControl><Input type="number" step="0.01" placeholder="Value" {...field} value={field.value ?? ''} onChange={e => { field.onChange(parseFloat(e.target.value) || undefined); }}
                                    className={brokerageType === 'Percentage' ? "pr-8" : ""}
                                  /></FormControl>
                                  {brokerageType === 'Percentage' && <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                                </div><FormMessage />
                              </FormItem>)} />
                            <FormField control={control} name="extraBrokeragePerKg" render={({ field }) => (
                              <FormItem><FormLabel>Extra (₹/kg)</FormLabel>
                                 <FormControl><Input type="number" step="0.01" placeholder="e.g. 0.50" {...field} value={field.value ?? ''} onChange={e => { field.onChange(parseFloat(e.target.value) || undefined); }} /></FormControl>
                                 <FormMessage />
                              </FormItem>)} />
                         </div>
                       )}
                  </div>
                  
                  <FormField control={control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Add any notes..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                  
                  <div className="p-4 border border-dashed rounded-md bg-muted/50 space-y-2">
                      <h3 className="text-lg font-semibold text-primary mb-2">Transaction Summary</h3>
                      <div className="flex justify-between"><span>Total Goods Value:</span> <span className="font-medium">₹{totalGoodsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                      {isCB && <div className="flex justify-between text-destructive"><span>Less: CB Deduction:</span> <span className="font-medium">(-) ₹{cbAmountInput.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
                      <div className="flex justify-between border-t pt-2 mt-2 text-primary font-bold text-lg"><p>Final Billed Amount:</p> <p>₹{billedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                      
                      <div className="text-sm text-muted-foreground space-y-1 pt-4 mt-4 border-t border-dashed">
                        <h4 className="font-semibold text-foreground">Profit & Loss Breakdown (Estimated)</h4>
                        <div className="flex justify-between"><span>Total Goods Value:</span> <span>₹{totalGoodsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        
                        <div className="pl-4 border-l-2 border-muted text-xs">
                          <div className="flex justify-between font-medium"><span>Less: Gross Purchase Cost</span><span>(-) ₹{totalGrossPurchaseCost.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        </div>

                        <div className={`flex justify-between font-bold ${grossProfit >= 0 ? 'text-cyan-600' : 'text-orange-600'}`}>
                            <span>Gross Profit:</span> <span>₹{grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        {additionalLandedCosts > 0 && 
                          <div className="flex justify-between text-xs text-muted-foreground"><span>Less: Add. Landed Costs</span><span>(-) ₹{additionalLandedCosts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        }

                        {totalSaleSideExpenses > 0 && (
                          <div className="pl-4 border-l-2 border-muted text-xs">
                            <div className="flex justify-between font-medium"><span>Less: Sale-Side Expenses</span><span>(-) ₹{totalSaleSideExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                              {calculatedBrokerageCommission > 0 && <div className="flex justify-between"><span>- Brokerage:</span><span>(-) ₹{calculatedBrokerageCommission.toLocaleString('en-IN')}</span></div>}
                              {calculatedExtraBrokerage > 0 && <div className="flex justify-between"><span>- Extra Brokerage:</span><span>(-) ₹{calculatedExtraBrokerage.toLocaleString('en-IN')}</span></div>}
                              {transportCostInput > 0 && <div className="flex justify-between"><span>- Transport:</span><span>(-) ₹{transportCostInput.toLocaleString('en-IN')}</span></div>}
                              {packingCostInput > 0 && <div className="flex justify-between"><span>- Packing:</span><span>(-) ₹{packingCostInput.toLocaleString('en-IN')}</span></div>}
                              {labourCostInput > 0 && <div className="flex justify-between"><span>- Labour:</span><span>(-) ₹{labourCostInput.toLocaleString('en-IN')}</span></div>}
                          </div>
                        )}
                        
                        <hr className="my-1 border-muted-foreground/50" />
                        <div className={`flex justify-between font-bold text-base ${finalNetProfit >= 0 ? 'text-green-600' : 'text-red-700'}`}>
                            <span>Estimated Net Profit:</span> <span>₹{finalNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                  </div>

                  <DialogFooter className="pt-4">
                    <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? (saleToEdit ? "Saving..." : "Creating Sale...") : (saleToEdit ? "Save Changes" : "Create Sale")}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </FormProvider>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
      {isMasterFormOpen && masterFormItemType && (<MasterForm isOpen={isMasterFormOpen} onClose={() => { setIsMasterFormOpen(false); setMasterFormItemType(null); }} onSubmit={handleMasterFormSubmit} itemTypeFromButton={masterFormItemType}/>)}
    </>
  );
};

export const AddSaleForm = React.memo(AddSaleFormComponent);

    