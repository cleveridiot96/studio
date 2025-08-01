
"use client";

import * as React from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { locationTransferSchema, type LocationTransferFormValues } from "@/lib/schemas/locationTransferSchema";
import type { MasterItem, Warehouse, Transporter, LocationTransfer, MasterItemType, ExpenseItem } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { MasterForm } from "@/components/app/masters/MasterForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AggregatedStockItemForForm } from './LocationTransferClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface AddLocationTransferFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transfer: LocationTransfer) => void;
  warehouses: Warehouse[];
  transporters: Transporter[];
  expenses: MasterItem[];
  allExpenseParties: MasterItem[];
  availableStock: AggregatedStockItemForForm[];
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  transferToEdit?: LocationTransfer | null;
}

export const AddLocationTransferForm: React.FC<AddLocationTransferFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  warehouses,
  transporters,
  expenses,
  allExpenseParties,
  availableStock,
  onMasterDataUpdate,
  transferToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<MasterItemType | null>(null);
  const [masterItemToEdit, setMasterItemToEdit] = React.useState<MasterItem | null>(null);
  
  const formSchema = React.useMemo(() => locationTransferSchema(warehouses, transporters, availableStock, transferToEdit), [warehouses, transporters, availableStock, transferToEdit]);

  const getDefaultValues = React.useCallback((): LocationTransferFormValues => {
    if (transferToEdit) {
      return {
          date: new Date(transferToEdit.date),
          fromWarehouseId: transferToEdit.fromWarehouseId,
          toWarehouseId: transferToEdit.toWarehouseId,
          transporterId: transferToEdit.transporterId || undefined,
          notes: transferToEdit.notes || "",
          items: transferToEdit.items.map(item => ({
            originalLotNumber: item.originalLotNumber,
            bagsToTransfer: item.bagsToTransfer,
            netWeightToTransfer: item.netWeightToTransfer,
            grossWeightToTransfer: item.grossWeightToTransfer
          })),
          expenses: transferToEdit.expenses || [],
        };
    }
    return {
        date: new Date(),
        fromWarehouseId: undefined,
        toWarehouseId: undefined,
        transporterId: undefined,
        notes: "",
        items: [{ originalLotNumber: "", bagsToTransfer: undefined, netWeightToTransfer: undefined, grossWeightToTransfer: undefined }],
        expenses: [],
      };
  }, [transferToEdit]);

  const methods = useForm<LocationTransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
    mode: 'onChange'
  });

  const { control, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = methods;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({
    control,
    name: "expenses",
  });

  const watchedFormValues = watch();

  const transferSummary = React.useMemo(() => {
    const { items, expenses } = watchedFormValues;
    const totalBags = (items || []).reduce((acc, item) => acc + (Number(item.bagsToTransfer) || 0), 0);
    const totalNetWeight = (items || []).reduce((acc, item) => acc + (Number(item.netWeightToTransfer) || 0), 0);
    const totalGrossWeight = (items || []).reduce((acc, item) => acc + (Number(item.grossWeightToTransfer) || 0), 0);
    const totalExpenses = (expenses || []).reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    const perKgExpense = totalGrossWeight > 0 ? totalExpenses / totalGrossWeight : 0;
    
    return { totalBags, totalNetWeight, totalGrossWeight, totalExpenses, perKgExpense };
  }, [watchedFormValues]);


  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
    }
  }, [isOpen, transferToEdit, reset, getDefaultValues]);

  const getAvailableLotsForSelectedWarehouse = React.useCallback((): { value: string; label: string; availableBags: number, averageWeightPerBag: number }[] => {
    const fromWarehouseId = watch('fromWarehouseId');
    if (!fromWarehouseId) return [];
    return availableStock
      .filter(item => item.locationId === fromWarehouseId && item.currentBags > 0)
      .map(item => ({
        value: item.lotNumber,
        label: `${item.lotNumber} (Avl: ${Math.round(item.currentBags)} bags)`,
        availableBags: item.currentBags,
        averageWeightPerBag: item.averageWeightPerBag,
      }))
      .sort((a,b) => a.label.localeCompare(b.label));
  }, [availableStock, watch('fromWarehouseId')]);

  const availableLotsOptions = getAvailableLotsForSelectedWarehouse();
  const expenseOptions = expenses.map(e => ({ value: e.id, label: e.name })).filter(e => e.value);


  const handleOpenMasterForm = (type: MasterItemType) => {
    setMasterItemToEdit(null);
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };
  
  const handleEditMasterItem = (type: MasterItemType, id: string) => {
    const party = allExpenseParties.find(p => p.id === id);
    if(party) {
        setMasterItemToEdit(party);
        setMasterFormItemType(party.type);
        setIsMasterFormOpen(true);
    }
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem);
    if (newItem.type === "Transporter") {
        methods.setValue('transporterId', newItem.id, { shouldValidate: true });
    }
    setIsMasterFormOpen(false);
    setMasterItemToEdit(null);
    toast({ title: `${newItem.type} "${newItem.name}" added/updated successfully.` });
  };

  const processSubmit = (values: LocationTransferFormValues) => {
    setIsSubmitting(true);
    const fromWarehouse = warehouses.find(w => w.id === values.fromWarehouseId);
    const toWarehouse = warehouses.find(w => w.id === values.toWarehouseId);
    const transporter = transporters.find(t => t.id === values.transporterId);

    const totalNetWeightForTransfer = values.items.reduce((sum, item) => sum + (item.netWeightToTransfer || 0), 0);

    const transferData: LocationTransfer = {
      id: transferToEdit?.id || `lt-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      fromWarehouseId: values.fromWarehouseId,
      fromWarehouseName: fromWarehouse?.name || values.fromWarehouseId,
      toWarehouseId: values.toWarehouseId,
      toWarehouseName: toWarehouse?.name || values.toWarehouseId,
      transporterId: values.transporterId,
      transporterName: transporter?.name,
      expenses: values.expenses?.map(exp => ({
        ...exp,
        partyName: allExpenseParties.find(p => p.id === exp.partyId)?.name || exp.partyName,
      })),
      totalExpenses: Math.round(transferSummary.totalExpenses),
      perKgExpense: transferSummary.perKgExpense,
      totalNetWeight: totalNetWeightForTransfer,
      totalGrossWeight: transferSummary.totalGrossWeight,
      items: values.items.map(item => {
        const stockInfo = availableStock.find(s => s.lotNumber === item.originalLotNumber && s.locationId === values.fromWarehouseId);
        return {
            originalLotNumber: item.originalLotNumber,
            newLotNumber: item.originalLotNumber,
            bagsToTransfer: Math.round(item.bagsToTransfer!),
            netWeightToTransfer: item.netWeightToTransfer!,
            grossWeightToTransfer: item.grossWeightToTransfer!,
            preTransferLandedCost: stockInfo?.effectiveRate || 0,
        };
      }),
      notes: values.notes,
    };
    onSubmit(transferData);
    setIsSubmitting(false);
    onClose();
  };

  const handleNumericInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const target = e.target;
    if (target.value === '0') {
      const fieldName = target.name as keyof LocationTransferFormValues;
      if (typeof fieldName === 'string') {
         setValue(fieldName as any, undefined, { shouldValidate: true });
      }
    } else {
      target.select();
    }
  };
  
  const handleItemNumericInputFocus = (e: React.FocusEvent<HTMLInputElement>, fieldName: any) => {
     const target = e.target;
     if (target.value === '0' || target.value === '') {
        setValue(fieldName, undefined, { shouldValidate: true });
     } else {
        target.select();
     }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{transferToEdit ? "Edit Location Transfer" : "New Location Transfer"}</DialogTitle>
            <DialogDescription>Transfer vakkals (lots) between your warehouse locations and record associated expenses.</DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}>
              <form onSubmit={handleSubmit(processSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto p-1 pr-3">
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Transfer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={control} name="date" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Transfer Date</FormLabel>
                        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "dd/MM/yy") : <span>Pick a date</span>}
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
                              disabled={(date) => date > new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>)}
                    />
                    <FormField control={control} name="fromWarehouseId" render={({ field }) => (
                      <FormItem><FormLabel>From Warehouse</FormLabel>
                        <MasterDataCombobox
                          value={field.value}
                          onChange={field.onChange}
                          options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                          placeholder="Select Source"
                          onAddNew={() => handleOpenMasterForm("Warehouse")}
                          onEdit={(id) => handleEditMasterItem("Warehouse", id)}
                        />
                        <FormMessage />
                      </FormItem>)}
                    />
                    <FormField control={control} name="toWarehouseId" render={({ field }) => (
                      <FormItem><FormLabel>To Warehouse</FormLabel>
                        <MasterDataCombobox
                          value={field.value}
                          onChange={field.onChange}
                          options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                          placeholder="Select Destination"
                          onAddNew={() => handleOpenMasterForm("Warehouse")}
                          onEdit={(id) => handleEditMasterItem("Warehouse", id)}
                        />
                        <FormMessage />
                      </FormItem>)}
                    />
                  </div>
                </div>
                
                <div className="p-4 border rounded-md shadow-sm space-y-4">
                  <h3 className="text-lg font-medium text-primary">Items to Transfer</h3>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 border-b last:border-b-0">
                      <FormField control={control} name={`items.${index}.originalLotNumber`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-3"><FormLabel>Vakkal/Lot No.</FormLabel>
                          <MasterDataCombobox
                            value={itemField.value}
                            onChange={itemField.onChange}
                            options={availableLotsOptions}
                            placeholder="Select Lot"
                            disabled={!watch('fromWarehouseId')}
                          />
                          <FormMessage />
                        </FormItem>)}
                      />
                      <FormItem className="md:col-span-2">
                        <FormLabel>Base Rate (₹/kg)</FormLabel>
                        <div className="font-medium text-sm h-10 flex items-center px-3 border border-dashed rounded-md bg-muted/50 text-foreground/80">
                           {(() => {
                              const lotValue = watch(`items.${index}.originalLotNumber`);
                              const stockInfo = availableStock.find(s => s.lotNumber === lotValue && s.locationId === watch('fromWarehouseId'));
                              return stockInfo ? `₹${stockInfo.purchaseRate.toLocaleString()}` : 'N/A';
                          })()}
                        </div>
                      </FormItem>
                      <FormField control={control} name={`items.${index}.bagsToTransfer`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Bags</FormLabel>
                          <FormControl><Input type="number" placeholder="Bags" {...itemField} value={itemField.value ?? ''}
                            onFocus={(e) => handleItemNumericInputFocus(e, `items.${index}.bagsToTransfer`)}
                            onChange={e => {
                              const bagsVal = parseFloat(e.target.value) || undefined;
                              itemField.onChange(bagsVal);
                              setValue(`items.${index}.grossWeightToTransfer`, Math.round((bagsVal || 0) * 50), { shouldValidate: true });
                              const lotValue = watch(`items.${index}.originalLotNumber`);
                              const stockInfo = availableStock.find(s => s.lotNumber === lotValue && s.locationId === watch('fromWarehouseId'));
                              const avgWeightPerBag = stockInfo?.averageWeightPerBag || 50;
                              let newNetWeight;
                              if (bagsVal && bagsVal > 0 && !isNaN(avgWeightPerBag)) {
                                newNetWeight = parseFloat(((bagsVal || 0) * avgWeightPerBag).toFixed(2));
                              }
                              setValue(`items.${index}.netWeightToTransfer`, newNetWeight, { shouldValidate: true });
                            }}
                            /></FormControl>
                          <FormMessage />
                        </FormItem>)}
                      />
                       <FormField control={control} name={`items.${index}.netWeightToTransfer`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Net Wt. (kg)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="Net Wt." {...itemField} value={itemField.value ?? ''} onFocus={(e) => handleItemNumericInputFocus(e, `items.${index}.netWeightToTransfer`)} onChange={e => itemField.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                          <FormMessage />
                        </FormItem>)}
                      />
                       <FormField control={control} name={`items.${index}.grossWeightToTransfer`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Gross Wt. (kg)</FormLabel>
                          <FormControl><Input type="number" placeholder="Gross Wt." {...itemField} value={itemField.value ?? ''} readOnly className="bg-muted/70" /></FormControl>
                          <FormMessage />
                        </FormItem>)}
                      />
                      <div className="md:col-span-1 flex items-end justify-end">
                        <Button type="button" variant="destructive" size="icon" onClick={() => (fields.length > 1 ? remove(index) : null)} disabled={fields.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-start mt-2">
                    <Button type="button" variant="outline" onClick={() => append({ originalLotNumber: "", bagsToTransfer: undefined, netWeightToTransfer: undefined, grossWeightToTransfer: undefined })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Vakkal
                    </Button>
                    <div className="p-3 border rounded-md bg-muted/50 text-right text-sm">
                        <p className="font-semibold">TOTAL BAGS: <span className="font-bold text-primary">{Math.round(transferSummary.totalBags).toLocaleString()}</span></p>
                        <p className="font-semibold">TOTAL NET WT: <span className="font-bold text-primary">{transferSummary.totalNetWeight.toLocaleString(undefined, {minimumFractionDigits:2})} KG</span></p>
                        <p className="font-semibold">TOTAL GROSS WT: <span className="font-bold text-primary">{transferSummary.totalGrossWeight.toLocaleString(undefined, {minimumFractionDigits:2})} KG</span></p>
                    </div>
                  </div>
                   {typeof errors.items === 'object' && !Array.isArray(errors.items) && errors.items.message && (
                    <FormMessage>{errors.items.message as string}</FormMessage>
                   )}
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">Additional Transfer Expenses</h3>
                   {expenseFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 border-b last:border-b-0">
                      <FormField control={control} name={`expenses.${index}.account`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-3"><FormLabel>Account</FormLabel>
                          <Select onValueChange={itemField.onChange} value={itemField.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl>
                            <SelectContent>
                               {expenseOptions.map(opt => <SelectItem key={opt.value} value={opt.label}>{opt.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name={`expenses.${index}.amount`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Amount (₹)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="Amount" {...itemField} value={itemField.value ?? ''} onChange={e => itemField.onChange(parseFloat(e.target.value) || undefined)} /></FormControl>
                          <FormMessage />
                        </FormItem>)} />
                       <FormField control={control} name={`expenses.${index}.partyId`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-3"><FormLabel>Party (Opt.)</FormLabel>
                          <MasterDataCombobox
                            value={itemField.value}
                            onChange={itemField.onChange}
                            options={allExpenseParties.map(p => ({value: p.id, label: `${p.name} (${p.type})`}))}
                            placeholder="Select Party"
                            addNewLabel="Add New Party"
                            onAddNew={() => handleOpenMasterForm("Transporter")}
                            onEdit={(id) => handleEditMasterItem("Expense", id)}
                          />
                          <FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name={`expenses.${index}.paymentMode`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-3"><FormLabel>Pay Mode</FormLabel>
                          <Select onValueChange={itemField.onChange} value={itemField.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank">Bank</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>)} />
                      <div className="md:col-span-1 flex items-center justify-end"><Button type="button" variant="destructive" size="icon" onClick={() => removeExpense(index)}><Trash2 className="h-4 w-4" /></Button></div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendExpense({ account: undefined, amount: undefined, paymentMode: "Cash", partyId: undefined, partyName: 'Self' })} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Expense Row
                  </Button>
                </div>
                
                <div className="p-4 border rounded-md shadow-sm bg-muted/50">
                    <h3 className="text-lg font-medium mb-3 text-primary">Cost Calculation & Final Landed Costs</h3>
                     <p className="text-sm text-muted-foreground mb-3">Total Expenses: ₹{Math.round(transferSummary.totalExpenses).toLocaleString('en-IN')} ÷ Total Gross Wt: {transferSummary.totalGrossWeight.toLocaleString('en-IN')} kg = <span className="font-bold">₹{transferSummary.perKgExpense.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/kg Transfer Cost</span></p>
                     <ScrollArea className="h-40">
                         <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead>Vakkal</TableHead>
                                     <TableHead className="text-right">Original Landed Cost</TableHead>
                                     <TableHead className="text-right">Transfer Cost</TableHead>
                                     <TableHead className="text-right font-bold text-primary">Final Landed Cost</TableHead>
                                 </TableRow>
                             </TableHeader>
                             <TableBody>
                                {watchedFormValues.items?.map((item, index) => {
                                    const stockInfo = availableStock.find(s => s.lotNumber === item.originalLotNumber && s.locationId === watch('fromWarehouseId'));
                                    const originalLandedCost = stockInfo?.effectiveRate || 0;
                                    const perKgExpense = transferSummary.perKgExpense || 0;
                                    const finalLandedCost = originalLandedCost > 0 ? originalLandedCost + perKgExpense : 0;

                                    return (
                                        <TableRow key={index} className="uppercase">
                                            <TableCell>{item.originalLotNumber || "N/A"}</TableCell>
                                            <TableCell className="text-right">₹{originalLandedCost.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</TableCell>
                                            <TableCell className="text-right">(+) ₹{perKgExpense.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</TableCell>
                                            <TableCell className="text-right font-bold text-primary">₹{finalLandedCost.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2})}</TableCell>
                                        </TableRow>
                                    );
                                })}
                                {(!watchedFormValues.items || watchedFormValues.items.length === 0 || !watchedFormValues.items[0].originalLotNumber) && (
                                    <TableRow><TableCell colSpan={4} className="text-center">Add items to see cost calculation.</TableCell></TableRow>
                                )}
                             </TableBody>
                         </Table>
                     </ScrollArea>
                 </div>

                <FormField control={control} name="notes" render={({ field }) => (
                  <FormItem className="p-4 border rounded-md shadow-sm">
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Add any notes for this transfer..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>)}
                />

                <DialogFooter className="pt-6">
                  <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (transferToEdit ? "Saving..." : "Creating Transfer...") : (transferToEdit ? "Save Changes" : "Create Transfer")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </FormProvider>
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
