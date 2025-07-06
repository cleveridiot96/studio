
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
import { MasterDataCombobox } from '@/components/shared/MasterDataCombobox';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { MasterForm } from '@/components/app/masters/MasterForm';

interface AggregatedStockItemForForm {
  lotNumber: string;
  currentBags: number;
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
      items: [{ lotNumber: "", quantity: 0, netWeight: 0, rate: 0 }],
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

  const memoizedDefaultValues = React.useMemo(() => getDefaultValues(), [getDefaultValues]);
  const memoizedSaleSchema = React.useMemo(() =>
    saleSchema(customers, transporters, brokers, availableStock, existingSales, saleToEdit?.id)
  , [customers, transporters, brokers, availableStock, existingSales, saleToEdit]);

  const methods = useForm<SaleFormValues>({
    resolver: zodResolver(memoizedSaleSchema),
    defaultValues: memoizedDefaultValues,
  });
  const { control, watch, reset, setValue, handleSubmit, formState: { errors } } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  React.useEffect(() => {
    if (isOpen) {
      reset(memoizedDefaultValues);
    }
  }, [isOpen, saleToEdit, reset, memoizedDefaultValues]);


  const watchedItems = watch("items");
  const isCB = watch("isCB");
  const cbAmountInput = watch("cbAmount"); 
  const transportCostInput = watch("transportCost") || 0;
  const packingCostInput = watch("packingCost") || 0;
  const labourCostInput = watch("labourCost") || 0;
  const selectedBrokerId = watch("brokerId");
  const brokerageType = watch("brokerageType");
  const brokerageValue = watch("brokerageValue");
  const extraBrokeragePerKg = watch("extraBrokeragePerKg") || 0;
  
  // --- Calculation Logic ---
  const totalNetWeight = React.useMemo(() => watchedItems.reduce((acc, item) => acc + (item.netWeight || 0), 0), [watchedItems]);
  const totalGoodsValue = React.useMemo(() => watchedItems.reduce((acc, item) => acc + ((item.netWeight || 0) * (item.rate || 0)), 0), [watchedItems]);
  const billedAmount = React.useMemo(() => isCB && cbAmountInput ? totalGoodsValue - cbAmountInput : totalGoodsValue, [isCB, cbAmountInput, totalGoodsValue]);

  const calculatedBrokerageCommission = React.useMemo(() => {
    if (!selectedBrokerId || brokerageValue === undefined || brokerageValue < 0) return 0;
    if (brokerageType === "Percentage") return (totalGoodsValue * (brokerageValue / 100));
    if (brokerageType === "Fixed") return brokerageValue;
    return 0;
  }, [selectedBrokerId, brokerageType, brokerageValue, totalGoodsValue]);

  const calculatedExtraBrokerage = React.useMemo(() => {
    if (!selectedBrokerId || extraBrokeragePerKg <= 0 || totalNetWeight <= 0) return 0;
    return extraBrokeragePerKg * totalNetWeight;
  }, [selectedBrokerId, extraBrokeragePerKg, totalNetWeight]);

  const totalSaleSideExpenses = React.useMemo(() => transportCostInput + packingCostInput + labourCostInput + calculatedBrokerageCommission + calculatedExtraBrokerage, [transportCostInput, packingCostInput, labourCostInput, calculatedBrokerageCommission, calculatedExtraBrokerage]);

  const totalCostOfGoodsSold = React.useMemo(() => {
      return watchedItems.reduce((acc, item) => {
          const stock = availableStock.find(s => s.lotNumber === item.lotNumber);
          const cogsForItem = (item.netWeight || 0) * (stock?.effectiveRate || 0);
          return acc + cogsForItem;
      }, 0);
  }, [watchedItems, availableStock]);

  const grossProfit = React.useMemo(() => totalGoodsValue - totalCostOfGoodsSold, [totalGoodsValue, totalCostOfGoodsSold]);
  const totalCalculatedProfit = React.useMemo(() => grossProfit - totalSaleSideExpenses, [grossProfit, totalSaleSideExpenses]);

  const handleOpenMasterForm = (type: MasterItemType) => {
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem);
    if (newItem.type === 'Customer') methods.setValue('customerId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Transporter') methods.setValue('transporterId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Broker') methods.setValue('brokerId', newItem.id, { shouldValidate: true });
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
      customerId: values.customerId,
      customerName: selectedCustomer?.name,
      brokerId: values.brokerId,
      brokerName: selectedBroker?.name,
      items: values.items.map(item => {
          const stock = availableStock.find(s => s.lotNumber === item.lotNumber);
          const itemGoodsValue = (item.netWeight || 0) * (item.rate || 0);
          const itemCOGS = (item.netWeight || 0) * (stock?.effectiveRate || 0);
          return {
              ...item,
              goodsValue: itemGoodsValue,
              costOfGoodsSold: itemCOGS,
          };
      }),
      totalGoodsValue: totalGoodsValue,
      billedAmount: billedAmount,
      totalQuantity: values.items.reduce((acc, item) => acc + (item.quantity || 0), 0),
      totalNetWeight: totalNetWeight,
      totalCostOfGoodsSold: totalCostOfGoodsSold,
      isCB: values.isCB,
      cbAmount: values.cbAmount,
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
      totalCalculatedProfit: totalCalculatedProfit,
    };
    onSubmit(saleData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{saleToEdit ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
            <DialogDescription>Create a sale with one or more items.</DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}>
              <form onSubmit={handleSubmit(processSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
                
                {/* Sale Details */}
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Sale Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Sale Date</FormLabel>
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}><PopoverTrigger asChild><FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button></FormControl></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsDatePickerOpen(false); }} disabled={(d) => d > new Date()} initialFocus /></PopoverContent>
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

                {/* Items Section */}
                <div className="p-4 border rounded-md shadow-sm space-y-4">
                  <h3 className="text-lg font-medium text-primary">Items</h3>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 border-b last:border-b-0">
                      <FormField control={control} name={`items.${index}.lotNumber`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-5"><FormLabel>Vakkal/Lot</FormLabel>
                          <MasterDataCombobox value={itemField.value} onChange={itemField.onChange} options={availableStock.map(s => ({ value: s.lotNumber, label: `${s.lotNumber} (${s.currentBags} bags)`}))} placeholder="Select Lot" /> <FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name={`items.${index}.quantity`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Bags</FormLabel><FormControl><Input type="number" placeholder="Bags" {...itemField} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={control} name={`items.${index}.netWeight`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Net Wt.</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Kg" {...itemField} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={control} name={`items.${index}.rate`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Rate</FormLabel><FormControl><Input type="number" step="0.01" placeholder="₹/kg" {...itemField} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                      <div className="md:col-span-1 flex items-end justify-end"><Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button></div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => append({ lotNumber: "", quantity: 0, netWeight: 0, rate: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                </div>

                {/* Bill Section */}
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Billing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <FormField control={control} name="billNumber" render={({ field }) => (
                      <FormItem><FormLabel>Bill Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., INV-001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="flex items-center space-x-2 pt-6">
                      <FormField control={control} name="isCB" render={({ field }) => (
                        <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="isCB-checkbox" /></FormControl><FormLabel htmlFor="isCB-checkbox" className="!mt-0">CB (Cut Bill)</FormLabel></FormItem>)} />
                      {isCB && <FormField control={control} name="cbAmount" render={({ field }) => (<FormItem className="flex-1"><FormControl><Input type="number" step="0.01" placeholder="CB Amount" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />}
                    </div>
                  </div>
                </div>

                {/* Expenses and Notes */}
                <div className="p-4 border rounded-md shadow-sm">
                    <h3 className="text-lg font-medium mb-3 text-primary">Expenses & Notes</h3>
                    {/* Expense fields here... */}
                    <FormField control={control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Add any notes..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                
                {/* Summary Section */}
                <div className="p-4 border border-dashed rounded-md bg-muted/50 space-y-2">
                    <h3 className="text-lg font-semibold text-primary mb-2">Transaction Summary</h3>
                    <div className="flex justify-between"><span>Total Goods Value:</span> <span className="font-medium">₹{totalGoodsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    {isCB && <div className="flex justify-between text-destructive"><span>Less: CB Deduction:</span> <span className="font-medium">(-) ₹{(cbAmountInput || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
                    <div className="flex justify-between border-t pt-2 mt-2 text-primary font-bold text-lg"><p>Final Billed Amount:</p> <p>₹{billedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
                    <div className="text-sm text-muted-foreground space-y-1 pt-4 mt-4 border-t border-dashed">
                        <h4 className="font-semibold text-foreground">Profit Calculation</h4>
                        <div className="flex justify-between"><span>Total Goods Value:</span> <span>₹{totalGoodsValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span>Less: Landed Cost of Goods:</span> <span className="font-medium">(-) ₹{totalCostOfGoodsSold.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        <div className={`flex justify-between font-bold ${grossProfit >= 0 ? 'text-cyan-600' : 'text-orange-600'}`}><span>Gross Profit:</span> <span>₹{grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                        {totalSaleSideExpenses > 0 && <div className="flex justify-between"><span>Less: Sale Side Expenses:</span> <span className="font-medium">(-) ₹{totalSaleSideExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>}
                        <hr className="my-1 border-muted-foreground/50" />
                        <div className={`flex justify-between font-bold text-base ${totalCalculatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}><span>Estimated Net Profit:</span> <span>₹{totalCalculatedProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
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
      {isMasterFormOpen && masterFormItemType && (<MasterForm isOpen={isMasterFormOpen} onClose={() => setIsMasterFormOpen(false)} onSubmit={handleMasterFormSubmit} itemTypeFromButton={masterFormItemType}/>)}
    </>
  );
};

export const AddSaleForm = React.memo(AddSaleFormComponent);
