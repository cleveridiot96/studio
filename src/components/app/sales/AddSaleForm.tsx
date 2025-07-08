
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
  const [masterItemToEdit, setMasterItemToEdit] = React.useState<MasterItem | null>(null);
  const [manualNetWeight, setManualNetWeight] = React.useState<Record<number, boolean>>({});

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
        commissionType: saleToEdit.commissionType,
        commission: saleToEdit.commission,
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
      commissionType: undefined,
      commission: undefined,
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
    mode: 'onChange',
  });
  const { control, watch, reset, setValue, handleSubmit, formState: { errors } } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  
  const watchedFormValues = watch();

  const summary = React.useMemo(() => {
    const {
        items, isCB, cbAmount, transportCost, packingCost, labourCost,
        commissionType, commission, extraBrokeragePerKg, brokerId
    } = watchedFormValues;
      
    let totalGoodsValue = 0;
    let totalNetWeight = 0;
    let totalQuantity = 0;
    let totalLandedCost = 0;

    (items || []).forEach(item => {
        const stockInfo = availableStock.find(s => s.lotNumber === item.lotNumber);
        const landedCostPerKg = stockInfo?.effectiveRate || stockInfo?.purchaseRate || 0;
        
        const netWeight = Number(item.netWeight) || 0;
        const saleRate = Number(item.rate) || 0;
        const quantity = Number(item.quantity) || 0;

        const lineSaleValue = netWeight * saleRate;
        
        totalGoodsValue += lineSaleValue;
        totalLandedCost += netWeight * landedCostPerKg;
        totalNetWeight += netWeight;
        totalQuantity += quantity;
    });

    const billedAmount = isCB ? totalGoodsValue - (Number(cbAmount) || 0) : totalGoodsValue;

    const calculatedBrokerageCommission = (() => {
      if (!brokerId || commission === undefined || commission < 0) return 0;
      if (commissionType === "Percentage") return totalGoodsValue * (commission / 100);
      if (commissionType === "Fixed") return commission;
      return 0;
    })();

    const calculatedExtraBrokerage = (Number(extraBrokeragePerKg) || 0) * totalNetWeight;
    const totalSaleSideExpenses = (Number(transportCost) || 0) + (Number(packingCost) || 0) + (Number(labourCost) || 0) + calculatedBrokerageCommission + calculatedExtraBrokerage;
    
    const grossProfit = totalGoodsValue - totalLandedCost;
    const netProfit = grossProfit - totalSaleSideExpenses;

    return { 
      totalGoodsValue,
      totalNetWeight,
      totalQuantity,
      billedAmount,
      totalLandedCost,
      totalGrossProfit: grossProfit, // Changed this name for clarity
      totalSaleSideExpenses,
      netProfit, 
      calculatedBrokerageCommission, 
      calculatedExtraBrokerage 
    };

  }, [watchedFormValues, availableStock]);

  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
      setManualNetWeight({});
    }
  }, [isOpen, saleToEdit, reset, getDefaultValues]);

  const handleBrokerChange = (brokerId: string | undefined) => {
    setValue("brokerId", brokerId, { shouldValidate: true });
    if (brokerId) {
        const broker = brokers.find(b => b.id === brokerId);
        setValue("commissionType", broker?.commissionType, { shouldValidate: true });
        setValue("commission", broker?.commission, { shouldValidate: true });
    } else {
        setValue("commissionType", undefined, { shouldValidate: true });
        setValue("commission", undefined, { shouldValidate: true });
    }
  };

  const handleOpenMasterForm = (type: MasterItemType) => {
    setMasterItemToEdit(null);
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };
  
  const handleEditMasterItem = (type: MasterItemType, id: string) => {
    let itemToEdit: MasterItem | null = null;
    if (type === 'Customer') itemToEdit = customers.find(i => i.id === id) || null;
    else if (type === 'Broker') itemToEdit = brokers.find(i => i.id === id) || null;
    else if (type === 'Transporter') itemToEdit = transporters.find(i => i.id === id) || null;

    if (itemToEdit) {
        setMasterItemToEdit(itemToEdit);
        setMasterFormItemType(type);
        setIsMasterFormOpen(true);
    }
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem);
    if (newItem.type === 'Customer') methods.setValue('customerId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Transporter') methods.setValue('transporterId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Broker') methods.setValue('brokerId', newItem.id, { shouldValidate: true });
    setIsMasterFormOpen(false); setMasterItemToEdit(null);
    toast({ title: `${newItem.type} added/updated successfully.` });
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
          const landedCost = stock?.effectiveRate || stock?.purchaseRate || 0;
          const netWeight = item.netWeight || 0;
          const saleRate = item.rate || 0;
          const goodsValue = netWeight * saleRate;

          const itemProportion = summary.totalGoodsValue > 0 ? goodsValue / summary.totalGoodsValue : 0;
          const apportionedExpenses = summary.totalSaleSideExpenses * itemProportion;
          const itemNetProfit = goodsValue - (netWeight * landedCost) - apportionedExpenses;
          
          return {
              lotNumber: item.lotNumber,
              quantity: item.quantity || 0,
              netWeight: netWeight,
              rate: saleRate,
              goodsValue: goodsValue,
              purchaseRate: stock?.purchaseRate || 0,
              costOfGoodsSold: netWeight * landedCost,
              itemProfit: itemNetProfit,
          };
      }),
      totalGoodsValue: summary.totalGoodsValue,
      billedAmount: summary.billedAmount,
      totalQuantity: summary.totalQuantity,
      totalNetWeight: summary.totalNetWeight,
      totalCostOfGoodsSold: summary.totalLandedCost,
      totalGrossProfit: summary.totalGrossProfit,
      totalCalculatedProfit: summary.netProfit,
      transporterId: values.transporterId,
      transporterName: selectedTransporter?.name,
      transportCost: values.transportCost,
      packingCost: values.packingCost,
      labourCost: values.labourCost,
      commissionType: values.commissionType,
      commission: values.commission,
      extraBrokeragePerKg: values.extraBrokeragePerKg,
      calculatedBrokerageCommission: summary.calculatedBrokerageCommission,
      calculatedExtraBrokerage: summary.calculatedExtraBrokerage,
      notes: values.notes,
    };
    onSubmit(saleData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(openState) => { if (!openState) { onClose(); } }}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{saleToEdit ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
            <DialogDescription>Create a sale with one or more items.</DialogDescription>
          </DialogHeader>
          <TooltipProvider>
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
                              {field.value ? format(field.value, "dd/MM/yy") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsDatePickerOpen(false); }} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                          </Popover><FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name="customerId" render={({ field }) => (
                        <FormItem><FormLabel>Customer</FormLabel>
                          <MasterDataCombobox 
                            value={field.value} 
                            onChange={field.onChange} 
                            options={customers.map(c => ({ value: c.id, label: c.name }))} 
                            placeholder="Select Customer" 
                            onAddNew={() => handleOpenMasterForm("Customer")}
                            onEdit={(id) => handleEditMasterItem("Customer", id)}
                          /> <FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name="brokerId" render={({ field }) => (
                        <FormItem><FormLabel>Broker (Optional)</FormLabel>
                          <MasterDataCombobox 
                            value={field.value} 
                            onChange={handleBrokerChange} 
                            options={brokers.map(b => ({ value: b.id, label: b.name }))} 
                            placeholder="Select Broker" 
                            onAddNew={() => handleOpenMasterForm("Broker")} 
                            onEdit={(id) => handleEditMasterItem("Broker", id)}
                          /> <FormMessage />
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
                                setManualNetWeight(prev => ({ ...prev, [index]: false }));
                                setValue(`items.${index}.quantity`, undefined, { shouldValidate: true });
                                setValue(`items.${index}.netWeight`, undefined, { shouldValidate: true });
                              }}
                              options={availableStock.map(s => ({
                                  value: s.lotNumber,
                                  label: `${s.lotNumber} (Avl: ${s.currentBags} bags) @ ₹${s.purchaseRate.toFixed(2)}`,
                                  tooltipContent: (
                                      <div>
                                          <p>Landed Cost: <span className="font-semibold">₹{s.effectiveRate.toFixed(2)}/kg</span></p>
                                          <p>Location: <span className="font-semibold">{s.locationName || 'Unknown'}</span></p>
                                      </div>
                                  )
                              }))}
                              placeholder="Select Lot" />
                            <FormMessage />
                          </FormItem>)} />
                        <FormField control={control} name={`items.${index}.quantity`} render={({ field: itemField }) => (
                          <FormItem className="md:col-span-2"><FormLabel>Bags</FormLabel>
                            <FormControl><Input type="number" placeholder="Bags" {...itemField} value={itemField.value ?? ''}
                              onChange={e => {
                                  const bagsVal = parseFloat(e.target.value) || undefined;
                                  itemField.onChange(bagsVal);
                                  if (!manualNetWeight[index]) {
                                      const lotValue = watch(`items.${index}.lotNumber`);
                                      const stockInfo = availableStock.find(s => s.lotNumber === lotValue);
                                      if (stockInfo && bagsVal) {
                                          const avgWeightPerBag = stockInfo.averageWeightPerBag || 50;
                                          const newNetWeight = parseFloat((bagsVal * avgWeightPerBag).toFixed(2));
                                          setValue(`items.${index}.netWeight`, newNetWeight, { shouldValidate: true });
                                      } else {
                                          setValue(`items.${index}.netWeight`, undefined, { shouldValidate: true });
                                      }
                                  }
                              }}
                             /></FormControl>
                            <FormMessage />
                          </FormItem>)} />
                        <FormField control={control} name={`items.${index}.netWeight`} render={({ field: itemField }) => (
                          <FormItem className="md:col-span-2"><FormLabel>Net Wt.</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Kg" {...itemField} value={itemField.value ?? ''}
                              onChange={e => {
                                setManualNetWeight(prev => ({ ...prev, [index]: true }));
                                itemField.onChange(parseFloat(e.target.value) || undefined)
                              }}
                          /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={control} name={`items.${index}.rate`} render={({ field: itemField }) => (
                          <FormItem className="md:col-span-2"><FormLabel>Sale Rate</FormLabel><FormControl><Input type="number" step="0.01" placeholder="₹/kg" {...itemField} value={itemField.value ?? ''} onChange={e => itemField.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="md:col-span-1 flex items-end justify-end"><Button type="button" variant="destructive" size="icon" onClick={() => fields.length > 1 ? remove(index) : null} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button></div>
                      </div>
                    ))}
                    <div className="flex justify-between items-start mt-2">
                      <Button type="button" variant="outline" onClick={() => append({ lotNumber: "", quantity: undefined, netWeight: undefined, rate: undefined })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
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
                        {watchedFormValues.isCB && <FormField control={control} name="cbAmount" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="number" step="0.01" placeholder="CB Amount" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-md shadow-sm">
                      <h3 className="text-lg font-medium mb-3 text-primary">Expenses &amp; Commission</h3>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                         <FormField control={control} name="transporterId" render={({ field }) => (
                          <FormItem className="col-span-full sm:col-span-2"><FormLabel>Transporter</FormLabel>
                            <MasterDataCombobox value={field.value} onChange={field.onChange}
                              options={transporters.filter(t => t.type === 'Transporter').map((t) => ({ value: t.id, label: t.name }))}
                              placeholder="Select Transporter" addNewLabel="Add New Transporter" onAddNew={() => handleOpenMasterForm("Transporter")}
                              onEdit={(id) => handleEditMasterItem("Transporter", id)}
                            /> <FormMessage />
                          </FormItem>)} />
                         <FormField control={control} name="transportCost" render={({ field }) => (<FormItem><FormLabel>Transport (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 5000" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={control} name="packingCost" render={({ field }) => (<FormItem><FormLabel>Packing (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 500" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                         <FormField control={control} name="labourCost" render={({ field }) => (<FormItem><FormLabel>Labour (₹)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g. 300" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                       </div>
                       {watchedFormValues.brokerId && (
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t items-end">
                            <FormField control={control} name="commissionType" render={({ field }) => (
                              <FormItem><FormLabel>Commission Type</FormLabel>
                                <ShadSelect onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="Fixed">Fixed (₹)</SelectItem>
                                    <SelectItem value="Percentage">%</SelectItem>
                                  </SelectContent>
                                </ShadSelect><FormMessage />
                              </FormItem>)} />
                            <FormField control={control} name="commission" render={({ field }) => (
                              <FormItem><FormLabel>Value</FormLabel>
                                <div className="relative">
                                  <FormControl><Input type="number" step="0.01" placeholder="Value" {...field} value={field.value ?? ''} onChange={e => { field.onChange(parseFloat(e.target.value) || undefined); }}
                                    className={watch('commissionType') === 'Percentage' ? "pr-8" : ""}
                                  /></FormControl>
                                  {watch('commissionType') === 'Percentage' && <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                                </div><FormMessage />
                              </FormItem>)} />
                            <FormField control={control} name="extraBrokeragePerKg" render={({ field }) => (
                              <FormItem><FormLabel>Extra (₹/kg)</FormLabel>
                                 <FormControl><Input type="number" step="0.01" placeholder="e.g. 0.50" {...field} value={field.value ?? ''} onChange={e => { field.onChange(parseFloat(e.target.value) || undefined); }} /></FormControl>
                                 <FormMessage />
                              </FormItem>)} />
                            <div className="text-sm text-muted-foreground pt-7">
                                = ₹{summary.calculatedBrokerageCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                         </div>
                       )}
                  </div>
                  
                  <FormField control={control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Add any notes..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                  
                  <div className="p-4 border border-dashed rounded-md bg-muted/50 space-y-2">
                      <h3 className="text-lg font-semibold text-primary mb-2">Transaction Summary</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex justify-between"><span>Total Goods Value:</span> <span>₹{summary.totalGoodsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        
                        <div className={`flex justify-between font-bold ${summary.totalGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <span>Gross Profit:</span> 
                             <Tooltip>
                                <TooltipTrigger asChild><span className="cursor-help underline decoration-dashed">₹{summary.totalGrossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></TooltipTrigger>
                                <TooltipContent><p>(Goods Value) - (Landed Purchase Cost)</p></TooltipContent>
                            </Tooltip>
                        </div>

                        <div className="flex justify-between text-red-600">
                           <span>Less: All Expenses:</span>
                            <Tooltip>
                                <TooltipTrigger asChild><span className="cursor-help underline decoration-dashed">(-) ₹{summary.totalSaleSideExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></TooltipTrigger>
                                <TooltipContent><p>Transport, Packing, Labour, Brokerage etc.</p></TooltipContent>
                            </Tooltip>
                        </div>
                         <hr className="my-1 border-muted-foreground/50" />
                        <div className={`flex justify-between font-bold text-base ${summary.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            <span>Net Profit:</span> 
                            <Tooltip>
                                <TooltipTrigger asChild><span className="cursor-help underline decoration-dashed">₹{summary.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></TooltipTrigger>
                                <TooltipContent><p>(Gross Profit) - (Sale Expenses)</p></TooltipContent>
                            </Tooltip>
                        </div>
                      </div>

                      <div className="border-t pt-2 mt-2">
                        {watchedFormValues.isCB && <div className="flex justify-between text-destructive"><span>Less: CB Deduction:</span> <span className="font-medium">(-) ₹{(Number(watchedFormValues.cbAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
                        <div className="flex justify-between text-primary font-bold text-lg"><p>Final Billed Amount:</p> <p>₹{summary.billedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                      </div>
                  </div>

                  <DialogFooter className="pt-4">
                    <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? (saleToEdit ? "Saving..." : "Creating Sale...") : (saleToEdit ? "Save Changes" : "Create Sale")}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </FormProvider>
          </TooltipProvider>
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

export const AddSaleForm = React.memo(AddSaleFormComponent);
