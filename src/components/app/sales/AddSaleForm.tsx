
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Info, Percent, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { saleSchema, type SaleFormValues } from '@/lib/schemas/saleSchema';
import type { MasterItem, MasterItemType, Sale, SaleItem, Broker, Customer, Transporter, CostBreakdown, ExpenseItem } from '@/lib/types';
import type { AggregatedStockItemForForm } from "./SalesClient";
import { MasterDataCombobox } from '@/components/shared/MasterDataCombobox';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { MasterForm } from '@/components/app/masters/MasterForm';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


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
  expenses: MasterItem[];
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
  expenses,
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
        billNumber: saleToEdit.billNumber || "",
        customerId: saleToEdit.customerId,
        brokerId: saleToEdit.brokerId || undefined,
        transporterId: saleToEdit.transporterId || undefined,
        items: saleToEdit.items.map(item => ({
            lotNumber: item.lotNumber,
            quantity: item.quantity,
            netWeight: item.netWeight,
            rate: item.rate
        })),
        expenses: saleToEdit.expenses || [],
        notes: saleToEdit.notes || "",
      };
    }
    return {
      date: new Date(),
      billNumber: "",
      customerId: undefined,
      brokerId: undefined,
      transporterId: undefined,
      items: [{ lotNumber: "", quantity: undefined, netWeight: undefined, rate: undefined }],
      expenses: [],
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
  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: "expenses" });
  
  const watchedFormValues = watch();

  const summary = React.useMemo(() => {
    const { items, expenses: formExpenses } = watchedFormValues;
      
    let totalGoodsValue = 0;
    let totalNetWeight = 0;
    let totalQuantity = 0;
    let totalLandedCost = 0;
    let totalBasePurchaseCost = 0;

    (items || []).forEach(item => {
        const stockInfo = availableStock.find(s => s.lotNumber === item.lotNumber);
        const landedCostPerKg = stockInfo?.effectiveRate || 0;
        const basePurchaseRate = stockInfo?.purchaseRate || 0;
        
        const netWeight = Number(item.netWeight) || 0;
        const saleRate = Number(item.rate) || 0;
        const quantity = Number(item.quantity) || 0;

        const lineSaleValue = netWeight * saleRate;
        
        totalGoodsValue += lineSaleValue;
        totalLandedCost += netWeight * landedCostPerKg;
        totalBasePurchaseCost += netWeight * basePurchaseRate;
        totalNetWeight += netWeight;
        totalQuantity += quantity;
    });

    const totalSaleSideExpenses = (formExpenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const cashDiscount = (formExpenses || []).find(e => e.account === 'Cash Discount')?.amount || 0;
    
    const billedAmount = totalGoodsValue - cashDiscount;
    const grossProfit = totalGoodsValue - totalBasePurchaseCost;
    const netProfit = totalGoodsValue - totalLandedCost - totalSaleSideExpenses;

    return { 
      totalGoodsValue,
      totalNetWeight,
      totalQuantity,
      billedAmount,
      totalBasePurchaseCost,
      totalLandedCost,
      totalGrossProfit: grossProfit,
      totalSaleSideExpenses,
      netProfit, 
    };

  }, [watchedFormValues, availableStock]);

  const brokerId = watch('brokerId');
  
  React.useEffect(() => {
    const broker = brokers.find(b => b.id === brokerId);
    const commissionIndex = watchedFormValues.expenses?.findIndex(exp => exp.account === 'Broker Commission');
    
    if (broker && broker.commission && summary.totalGoodsValue > 0) {
        let commissionAmount = 0;
        if (broker.commissionType === 'Percentage') {
            commissionAmount = summary.totalGoodsValue * (broker.commission / 100);
        } else {
            commissionAmount = broker.commission;
        }

        const newCommissionExpense: ExpenseItem = {
            account: 'Broker Commission',
            amount: parseFloat(commissionAmount.toFixed(2)),
            paymentMode: 'Pending',
            partyId: broker.id,
            partyName: broker.name,
        };

        if (commissionIndex !== undefined && commissionIndex > -1) {
            setValue(`expenses.${commissionIndex}`, newCommissionExpense, { shouldValidate: true });
        } else {
            appendExpense(newCommissionExpense);
        }
    } else {
        if (commissionIndex !== undefined && commissionIndex > -1) {
            removeExpense(commissionIndex);
        }
    }
  }, [brokerId, brokers, summary.totalGoodsValue, setValue, appendExpense, removeExpense, watchedFormValues.expenses]);


  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
      setManualNetWeight({});
    }
  }, [isOpen, saleToEdit, reset, getDefaultValues]);

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
    if (newItem.type === 'Broker') methods.setValue('brokerId', newItem.id, { shouldValidate: true });
    if (newItem.type === 'Transporter') methods.setValue('transporterId', newItem.id, { shouldValidate: true });
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
      customerId: values.customerId,
      customerName: selectedCustomer?.name,
      brokerId: values.brokerId,
      brokerName: selectedBroker?.name,
      transporterId: values.transporterId,
      transporterName: selectedTransporter?.name,
      items: values.items.map(item => {
          const stock = availableStock.find(s => s.lotNumber === item.lotNumber);
          const landedCostPerKg = stock?.effectiveRate || 0;
          const basePurchaseRate = stock?.purchaseRate || 0;
          const netWeight = item.netWeight || 0;
          const saleRate = item.rate || 0;
          const goodsValue = netWeight * saleRate;

          const itemProportion = summary.totalGoodsValue > 0 ? goodsValue / summary.totalGoodsValue : 0;
          const apportionedSaleExpenses = summary.totalSaleSideExpenses * itemProportion;

          const itemGrossProfit = goodsValue - (netWeight * basePurchaseRate);
          const itemNetProfit = goodsValue - (netWeight * landedCostPerKg) - apportionedSaleExpenses;
          
          return {
              lotNumber: item.lotNumber,
              quantity: Math.round(item.quantity || 0),
              netWeight: item.netWeight,
              rate: saleRate,
              goodsValue: Math.round(goodsValue),
              purchaseRate: basePurchaseRate,
              costOfGoodsSold: netWeight * landedCostPerKg,
              itemGrossProfit: Math.round(itemGrossProfit),
              itemNetProfit: Math.round(itemNetProfit),
              costBreakdown: stock?.costBreakdown || { baseRate: 0, purchaseExpenses: 0, transferExpenses: 0 },
          };
      }),
      expenses: values.expenses?.map(exp => ({ ...exp, partyName: exp.partyName || 'Self' })),
      totalGoodsValue: Math.round(summary.totalGoodsValue),
      billedAmount: Math.round(summary.billedAmount),
      totalQuantity: Math.round(summary.totalQuantity),
      totalNetWeight: summary.totalNetWeight,
      totalCostOfGoodsSold: Math.round(summary.totalLandedCost),
      totalGrossProfit: Math.round(summary.totalGrossProfit),
      totalCalculatedProfit: Math.round(summary.netProfit),
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField control={control} name="date" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Sale Date</FormLabel>
                          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}><PopoverTrigger asChild><FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "dd/MM/yy") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button></FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsDatePickerOpen(false); }} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                          </Popover><FormMessage />
                        </FormItem>)} />
                       <FormField control={control} name="billNumber" render={({ field }) => (
                        <FormItem><FormLabel>Bill Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., INV-001" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
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
                            onChange={field.onChange} 
                            options={brokers.map(b => ({ value: b.id, label: b.name }))} 
                            placeholder="Select Broker" 
                            onAddNew={() => handleOpenMasterForm("Broker")}
                            onEdit={(id) => handleEditMasterItem("Broker", id)}
                          />
                          <FormMessage />
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
                                  label: `${s.lotNumber} (Avl: ${Math.round(s.currentBags)} bags) @ ₹${Math.round(s.purchaseRate)}`,
                                  tooltipContent: (
                                      <div>
                                          <p>Landed Cost: <span className="font-semibold">₹{Math.round(s.effectiveRate)}/kg</span></p>
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
                      <h3 className="text-lg font-medium mb-3 text-primary">Expenses &amp; Commission</h3>
                      {expenseFields.map((field, index) => {
                          const isCommission = field.account === 'Broker Commission';
                          return (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 border-b last:border-b-0">
                              <FormField control={control} name={`expenses.${index}.account`} render={({ field: itemField }) => (
                                <FormItem className="md:col-span-3"><FormLabel>Account</FormLabel>
                                  <Select onValueChange={itemField.onChange} value={itemField.value} disabled={isCommission}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      <SelectItem value="Broker Commission">Broker Commission</SelectItem>
                                      <SelectItem value="Extra Brokerage">Extra Brokerage</SelectItem>
                                      <SelectItem value="Cash Discount">Cash Discount</SelectItem>
                                      {expenses.map(opt => <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select><FormMessage />
                                </FormItem>)} />
                              <FormField control={control} name={`expenses.${index}.amount`} render={({ field: itemField }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Amount (₹)</FormLabel>
                                  <FormControl><Input type="number" step="0.01" placeholder="Amount" {...itemField} readOnly={isCommission} value={itemField.value ?? ''} onChange={e => itemField.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                                  <FormMessage />
                                </FormItem>)} />
                              <FormField control={control} name={`expenses.${index}.partyId`} render={({ field: itemField }) => (
                                <FormItem className="md:col-span-3"><FormLabel>Party (Opt.)</FormLabel>
                                  <MasterDataCombobox value={itemField.value} onChange={itemField.onChange}
                                    options={brokers.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))}
                                    placeholder="Select Party" addNewLabel="Add New Broker"
                                    onAddNew={() => handleOpenMasterForm("Broker")} onEdit={(id) => handleEditMasterItem("Broker", id)}
                                    disabled={isCommission}
                                  /> <FormMessage />
                                </FormItem>)} />
                              <FormField control={control} name={`expenses.${index}.paymentMode`} render={({ field: itemField }) => (
                                <FormItem className="md:col-span-3"><FormLabel>Pay Mode</FormLabel>
                                  <Select onValueChange={itemField.onChange} defaultValue={itemField.value} disabled={isCommission}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Auto-adjusted">Auto-adjusted</SelectItem>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Bank">Bank</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                    </SelectContent>
                                  </Select><FormMessage />
                                </FormItem>)} />
                              <div className="md:col-span-1 flex items-center justify-end">
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeExpense(index)} disabled={isCommission}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          );
                        })}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendExpense({ account: undefined, amount: undefined, paymentMode: "Auto-adjusted" })} className="mt-2">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Expense Row
                      </Button>
                  </div>
                  
                  <FormField control={control} name="notes" render={({ field }) => (
                      <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Add any notes..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="summary">
                      <AccordionTrigger>
                        <h3 className="text-lg font-semibold text-primary">Transaction Summary</h3>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="p-4 border border-dashed rounded-md bg-muted/50 space-y-2">
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex justify-between"><span>Total Goods Value:</span> <span>₹{Math.round(summary.totalGoodsValue).toLocaleString('en-IN')}</span></div>
                              
                              <div className={`flex justify-between font-bold ${summary.totalGrossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  <span>Gross Profit:</span> 
                                  <Tooltip>
                                      <TooltipTrigger asChild><span className="cursor-help underline decoration-dashed">₹{Math.round(summary.totalGrossProfit).toLocaleString('en-IN')}</span></TooltipTrigger>
                                      <TooltipContent><p>(Goods Value) - (Base Purchase Cost)</p></TooltipContent>
                                  </Tooltip>
                              </div>

                              <div className="flex justify-between text-red-600">
                                <span>Less: All Expenses:</span>
                                  <Tooltip>
                                      <TooltipTrigger asChild><span className="cursor-help underline decoration-dashed">(-) ₹{Math.round(summary.totalSaleSideExpenses).toLocaleString('en-IN')}</span></TooltipTrigger>
                                      <TooltipContent><p>Transport, Packing, Labour, Brokerage etc.</p></TooltipContent>
                                  </Tooltip>
                              </div>
                              <hr className="my-1 border-muted-foreground/50" />
                              <div className={`flex justify-between font-bold text-base ${summary.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  <span>Net Profit:</span> 
                                  <Tooltip>
                                      <TooltipTrigger asChild><span className="cursor-help underline decoration-dashed">₹{Math.round(summary.netProfit).toLocaleString('en-IN')}</span></TooltipTrigger>
                                      <TooltipContent><p>(Goods Value) - (Landed Cost) - (Sale Expenses)</p></TooltipContent>
                                  </Tooltip>
                              </div>
                            </div>

                            <div className="border-t pt-2 mt-2">
                              <div className="flex justify-between text-primary font-bold text-lg"><p>Final Billed Amount:</p> <p>₹{Math.round(summary.billedAmount).toLocaleString('en-IN')}</p></div>
                            </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>


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
