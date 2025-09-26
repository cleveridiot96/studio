
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
import { CalendarIcon, Info, Percent, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { purchaseSchema, type PurchaseFormValues } from "@/lib/schemas/purchaseSchema";
import type { MasterItem, Purchase, MasterItemType, PurchaseItem, Agent, ExpenseItem } from "@/lib/types";
import { MasterDataCombobox } from "@/components/shared/MasterDataCombobox";
import { useToast } from "@/hooks/use-toast";
import { MasterForm } from "@/components/app/masters/MasterForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddPurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (purchase: Purchase) => void;
  suppliers: MasterItem[];
  agents: Agent[];
  warehouses: MasterItem[];
  transporters: MasterItem[];
  expenses: MasterItem[];
  allExpenseParties: MasterItem[];
  onMasterDataUpdate: (type: MasterItemType, item: MasterItem) => void;
  purchaseToEdit?: Purchase | null;
}

export const AddPurchaseForm: React.FC<AddPurchaseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  agents,
  warehouses,
  transporters,
  expenses,
  allExpenseParties,
  onMasterDataUpdate,
  purchaseToEdit,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  const [isMasterFormOpen, setIsMasterFormOpen] = React.useState(false);
  const [masterFormItemType, setMasterFormItemType] = React.useState<MasterItemType | null>(null);
  const [masterItemToEdit, setMasterItemToEdit] = React.useState<MasterItem | null>(null);
  const [manualNetWeight, setManualNetWeight] = React.useState<Record<number, boolean>>({});

  // IMPORTANT: useMemo is NOT used here to ensure the schema is re-evaluated on every render
  // This is necessary because the validation logic depends on props that can change (e.g., availableStock)
  const formSchema = purchaseSchema(suppliers, agents, warehouses, transporters, expenses);


  const getDefaultValues = React.useCallback((): PurchaseFormValues => {
    if (purchaseToEdit) {
      return {
        date: new Date(purchaseToEdit.date),
        locationId: purchaseToEdit.locationId,
        supplierId: purchaseToEdit.supplierId,
        agentId: purchaseToEdit.agentId || undefined,
        transporterId: purchaseToEdit.transporterId || undefined,
        items: purchaseToEdit.items.map(item => ({
            lotNumber: item.lotNumber,
            quantity: item.quantity,
            netWeight: item.netWeight,
            rate: item.rate
        })),
        expenses: purchaseToEdit.expenses || [],
      };
    }
    return {
      date: new Date(),
      locationId: undefined,
      supplierId: undefined,
      agentId: undefined,
      transporterId: undefined,
      items: [{ lotNumber: "", quantity: undefined, netWeight: undefined, rate: undefined }],
      expenses: [],
    };
  }, [purchaseToEdit]);

  const methods = useForm<PurchaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
    mode: 'onChange', 
  });
  const { control, watch, setValue, handleSubmit: formHandleSubmit, reset, formState: { errors } } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: "expenses" });

  const watchedFormValues = watch();
  
  const summary = React.useMemo(() => {
    const { items, expenses: formExpenses } = watchedFormValues;

    let totalGoodsValue = 0;
    let totalNetWeight = 0;
    let totalQuantity = 0;

    const itemsWithGoodsValue = (items || []).map(item => {
        const netWeight = Number(item.netWeight) || 0;
        const rate = Number(item.rate) || 0;
        const quantity = Number(item.quantity) || 0;
        const goodsValue = netWeight * rate;
        totalGoodsValue += goodsValue;
        totalNetWeight += netWeight;
        totalQuantity += quantity;
        return { ...item, goodsValue };
    });

    const totalExpenses = (formExpenses || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalAmount = totalGoodsValue + totalExpenses;
    const expensesPerKg = totalNetWeight > 0 ? totalExpenses / totalNetWeight : 0;
    
    const itemsWithLandedCost = itemsWithGoodsValue.map(item => {
        const itemRate = Number(item.rate) || 0;
        const landedCostPerKg = itemRate + expensesPerKg;
        return { ...item, landedCostPerKg: landedCostPerKg };
    });

    return {
        totalGoodsValue,
        totalExpenses,
        totalAmount,
        totalNetWeight,
        totalQuantity,
        itemsWithLandedCost,
    };
  }, [watchedFormValues]);

  const agentId = watch('agentId');
  React.useEffect(() => {
    const agent = agents.find(a => a.id === agentId);
    const commissionIndex = watchedFormValues.expenses?.findIndex(exp => exp.account === 'Broker Commission');
    
    if (agent && agent.commission && summary.totalGoodsValue > 0) {
        let commissionAmount = 0;
        if (agent.commissionType === 'Percentage') {
            commissionAmount = summary.totalGoodsValue * (agent.commission / 100);
        } else {
            commissionAmount = agent.commission;
        }

        const newCommissionExpense: ExpenseItem = {
            account: 'Broker Commission',
            amount: parseFloat(commissionAmount.toFixed(2)),
            paymentMode: 'Pending',
            partyId: agent.id,
            partyName: agent.name,
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
  }, [agentId, agents, summary.totalGoodsValue, setValue, appendExpense, removeExpense, watchedFormValues.expenses]);


  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
      setManualNetWeight({});
    }
  }, [purchaseToEdit, isOpen, reset, getDefaultValues]);
  
  const handleOpenMasterForm = (type: MasterItemType) => {
    setMasterItemToEdit(null);
    setMasterFormItemType(type);
    setIsMasterFormOpen(true);
  };
  
  const handleEditMasterItem = (type: MasterItemType, id: string) => {
    let itemToEdit: MasterItem | null = null;
    if (type === 'Supplier') itemToEdit = suppliers.find(i => i.id === id) || null;
    else if (type === 'Agent') itemToEdit = agents.find(i => i.id === id) || null;
    else if (type === 'Warehouse') itemToEdit = warehouses.find(i => i.id === id) || null;
    else if (type === 'Transporter') itemToEdit = transporters.find(i => i.id === id) || null;
    else if (type === 'Expense') itemToEdit = allExpenseParties.find(i => i.id === id) || null;

    if (itemToEdit) {
        setMasterItemToEdit(itemToEdit);
        setMasterFormItemType(type);
        setIsMasterFormOpen(true);
    }
  };

  const handleMasterFormSubmit = (newItem: MasterItem) => {
    onMasterDataUpdate(newItem.type, newItem);
    if (newItem.type === masterFormItemType) {
        if (newItem.type === 'Supplier') methods.setValue('supplierId', newItem.id, { shouldValidate: true });
        else if (newItem.type === 'Agent') methods.setValue('agentId', newItem.id, { shouldValidate: true });
        else if (newItem.type === 'Warehouse') methods.setValue('locationId', newItem.id, { shouldValidate: true });
        else if (newItem.type === 'Transporter') methods.setValue('transporterId', newItem.id, { shouldValidate: true });
    }
    setIsMasterFormOpen(false);
    setMasterFormItemType(null);
    toast({ title: `${newItem.type} "${newItem.name}" added/updated successfully!` });
  };

  const processSubmit = (values: PurchaseFormValues) => {
    setIsSubmitting(true);
    
    const totalAmount = Math.round(summary.totalAmount);
    const effectiveRate = summary.totalNetWeight > 0 ? totalAmount / summary.totalNetWeight : 0;

    const purchaseData: Purchase = {
      id: purchaseToEdit?.id || `purchase-${Date.now()}`,
      date: format(values.date, "yyyy-MM-dd"),
      locationId: values.locationId as string,
      locationName: warehouses.find(w => w.id === values.locationId)?.name,
      supplierId: values.supplierId as string,
      supplierName: suppliers.find(s => s.id === values.supplierId)?.name,
      agentId: values.agentId,
      agentName: agents.find(a => a.id === values.agentId)?.name,
      transporterId: values.transporterId,
      transporterName: transporters.find(t => t.id === values.transporterId)?.name,
      items: summary.itemsWithLandedCost.map(item => ({
        lotNumber: item.lotNumber,
        quantity: Math.round(item.quantity || 0),
        netWeight: item.netWeight || 0,
        rate: item.rate || 0,
        goodsValue: Math.round(item.goodsValue || 0),
        landedCostPerKg: item.landedCostPerKg,
      })),
      expenses: values.expenses?.map(exp => ({
        ...exp,
        partyName: allExpenseParties.find(p => p.id === exp.partyId)?.name || exp.partyName,
      })),
      totalGoodsValue: Math.round(summary.totalGoodsValue),
      totalQuantity: Math.round(summary.totalQuantity),
      totalNetWeight: summary.totalNetWeight,
      totalAmount,
      effectiveRate,
    };
    onSubmit(purchaseData);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !isMasterFormOpen} onOpenChange={(openState) => { if (!openState) onClose(); }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{purchaseToEdit ? 'EDIT PURCHASE' : 'ADD NEW PURCHASE'}</DialogTitle>
            <DialogDescription>ENTER THE DETAILS FOR THE PURCHASE RECORD. CLICK SAVE WHEN YOU'RE DONE.</DialogDescription>
          </DialogHeader>
          <FormProvider {...methods}>
            <Form {...methods}> 
              <form onSubmit={formHandleSubmit(processSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 pr-3">
                
                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">BASIC DETAILS & PARTIES</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <FormField control={control} name="date" render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>PURCHASE DATE</FormLabel>
                            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}><PopoverTrigger asChild><FormControl>
                                  <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "dd/MM/yy") : <span>PICK A DATE</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button></FormControl></PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsDatePickerOpen(false); }} disabled={(date) => date > new Date()} initialFocus />
                              </PopoverContent>
                            </Popover><FormMessage />
                          </FormItem>)} />
                       <FormField control={control} name="supplierId" render={({ field }) => ( 
                          <FormItem>
                            <FormLabel>SUPPLIER</FormLabel>
                            <MasterDataCombobox value={field.value} onChange={field.onChange}
                                options={suppliers.filter(s => s.type === "Supplier").map(s => ({ value: s.id, label: s.name }))}
                                placeholder="SELECT SUPPLIER" searchPlaceholder="SEARCH SUPPLIERS..." notFoundMessage="NO SUPPLIER FOUND." 
                                addNewLabel="ADD NEW SUPPLIER" onAddNew={() => handleOpenMasterForm("Supplier")}
                                onEdit={(id) => handleEditMasterItem("Supplier", id)}
                             />
                            <FormMessage />
                          </FormItem>)} />
                       <FormField control={control} name="agentId" render={({ field }) => ( 
                          <FormItem>
                            <FormLabel>AGENT (OPTIONAL)</FormLabel>
                            <MasterDataCombobox
                              value={field.value}
                              onChange={field.onChange}
                              options={agents.filter(a => a.type === "Agent").map(a => ({ value: a.id, label: a.name }))}
                              placeholder="SELECT AGENT"
                              addNewLabel="ADD NEW AGENT"
                              onAddNew={() => handleOpenMasterForm("Agent")}
                              onEdit={(id) => handleEditMasterItem("Agent", id)}
                            />
                            <FormMessage />
                          </FormItem>)} />
                      <FormField control={control} name="locationId" render={({ field }) => (
                          <FormItem>
                            <FormLabel>LOCATION (WAREHOUSE)</FormLabel>
                            <MasterDataCombobox value={field.value} onChange={field.onChange}
                                options={warehouses.filter(w => w.type === "Warehouse").map(w => ({ value: w.id, label: w.name }))}
                                placeholder="SELECT LOCATION" searchPlaceholder="SEARCH LOCATIONS..." notFoundMessage="NO LOCATION FOUND."
                                addNewLabel="ADD NEW LOCATION" onAddNew={() => handleOpenMasterForm("Warehouse")} 
                                onEdit={(id) => handleEditMasterItem("Warehouse", id)}
                                />
                            <FormMessage />
                          </FormItem>)} />
                  </div>
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium text-primary">ITEMS</h3>
                   {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 border-b last:border-b-0">
                      <FormField control={control} name={`items.${index}.lotNumber`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-3"><FormLabel>VAKKAL/LOT NO.</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="E.G., AB/6 OR BU-5" 
                              {...itemField}
                              onChange={(e) => {
                                const lotNumber = e.target.value;
                                itemField.onChange(lotNumber);
                                const match = lotNumber.match(/[/\s-.,;](\d+)$/);
                                if (match && match[1]) {
                                  const bags = parseInt(match[1], 10);
                                  if (!isNaN(bags)) {
                                    setValue(`items.${index}.quantity`, bags, { shouldValidate: true });
                                    if (!manualNetWeight[index]) {
                                      setValue(`items.${index}.netWeight`, bags * 50, { shouldValidate: true });
                                    }
                                  }
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name={`items.${index}.quantity`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>BAGS</FormLabel>
                          <FormControl><Input type="number" step="1" placeholder="BAGS" {...itemField} value={itemField.value ?? ''} 
                            onChange={e => {
                                const bags = parseFloat(e.target.value) || undefined;
                                itemField.onChange(bags);
                                if (!manualNetWeight[index]) {
                                    setValue(`items.${index}.netWeight`, (bags || 0) * 50, { shouldValidate: true });
                                }
                            }}
                           /></FormControl>
                          <FormMessage /></FormItem>)} />
                      <FormField control={control} name={`items.${index}.netWeight`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>NET WT.</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="KG" {...itemField} value={itemField.value ?? ''} 
                            onChange={e => {
                                setManualNetWeight(prev => ({ ...prev, [index]: true }));
                                itemField.onChange(parseFloat(e.target.value) || undefined);
                            }}
                           /></FormControl>
                          <FormMessage /></FormItem>)} />
                      <FormField control={control} name={`items.${index}.rate`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>RATE</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="₹/KG" {...itemField} value={itemField.value ?? ''} onChange={e => itemField.onChange(parseFloat(e.target.value) || undefined)}/></FormControl>
                          <FormMessage /></FormItem>)} />
                      <div className="md:col-span-2">
                        <FormLabel>GOODS VALUE (₹)</FormLabel>
                        <div className="font-medium text-sm h-10 flex items-center px-3 border border-dashed rounded-md bg-muted/50 text-foreground/80">
                            {Math.round(summary.itemsWithLandedCost[index]?.goodsValue || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="md:col-span-1 flex items-end justify-end">
                        <Button type="button" variant="destructive" size="icon" onClick={() => (fields.length > 1 ? remove(index) : null)} disabled={fields.length <= 1}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-start mt-2">
                    <Button type="button" variant="outline" onClick={() => append({ lotNumber: "", quantity: undefined, netWeight: undefined, rate: undefined })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> ADD ITEM
                    </Button>
                  </div>
                </div>

                <div className="p-4 border rounded-md shadow-sm">
                  <h3 className="text-lg font-medium mb-3 text-primary">EXPENSES</h3>
                  {expenseFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3 border-b last:border-b-0">
                      <FormField control={control} name={`expenses.${index}.account`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-3"><FormLabel>Account</FormLabel>
                          <Select onValueChange={itemField.onChange} value={itemField.value} disabled={itemField.value === 'Broker Commission'}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Account" /></SelectTrigger></FormControl>
                            <SelectContent>
                               <SelectItem value="Broker Commission">Broker Commission</SelectItem>
                              {expenses.map(opt => <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>)}
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name={`expenses.${index}.amount`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Amount (₹)</FormLabel>
                          <FormControl><Input type="number" step="0.01" placeholder="Amount" {...itemField} value={itemField.value ?? ''} onChange={e => itemField.onChange(parseFloat(e.target.value) || undefined)} readOnly={field.account === 'Broker Commission'} /></FormControl>
                          <FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name={`expenses.${index}.partyId`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-3"><FormLabel>Party (Opt.)</FormLabel>
                          <MasterDataCombobox value={itemField.value} onChange={itemField.onChange}
                            options={allExpenseParties.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))}
                            placeholder="Select Party" addNewLabel="Add New Party"
                            onAddNew={() => handleOpenMasterForm("Transporter")} onEdit={(id) => handleEditMasterItem("Expense", id)}
                            disabled={field.account === 'Broker Commission'}
                          /> <FormMessage />
                        </FormItem>)} />
                      <FormField control={control} name={`expenses.${index}.paymentMode`} render={({ field: itemField }) => (
                        <FormItem className="md:col-span-3"><FormLabel>Pay Mode</FormLabel>
                          <Select onValueChange={itemField.onChange} defaultValue={itemField.value} disabled={field.account === 'Broker Commission'}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Bank">Bank</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent>
                          </Select><FormMessage />
                        </FormItem>)} />
                      <div className="md:col-span-1 flex items-center justify-end">
                        <Button type="button" variant="destructive" size="icon" onClick={() => removeExpense(index)} disabled={field.account === 'Broker Commission'}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendExpense({ account: undefined, amount: undefined, paymentMode: "Cash", partyId: undefined, partyName: 'Self' })} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Expense Row
                  </Button>
                </div>

                <div className="p-4 border border-dashed rounded-md bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between text-md font-semibold">
                      <span>GOODS VALUE:</span>
                      <p>₹{Math.round(summary.totalGoodsValue).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center justify-between text-md font-semibold">
                      <span>TOTAL EXPENSES:</span>
                      <p>₹{Math.round(summary.totalExpenses).toLocaleString('en-IN')}</p>
                  </div>
                   <div className="flex items-center justify-between border-t pt-2 mt-2">
                      <div className="flex items-center text-lg font-semibold text-primary"><Info className="w-5 h-5 mr-2" />TOTAL PURCHASE VALUE:</div>
                      <p className="text-xl font-bold text-primary">₹{Math.round(summary.totalAmount).toLocaleString('en-IN')}</p>
                  </div>
                  {summary.totalNetWeight > 0 && summary.itemsWithLandedCost.length > 0 && (
                     <div className="pt-4 border-t mt-4">
                        <h4 className="font-semibold mb-2 text-muted-foreground">PER-VAKKAL LANDED COST</h4>
                        <ScrollArea className="h-24">
                           <Table size="sm">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>VAKKAL</TableHead>
                                    <TableHead className="text-right">LANDED COST (₹/KG)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {summary.itemsWithLandedCost.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.lotNumber || `ITEM ${index + 1}`}</TableCell>
                                    <TableCell className="text-right font-medium">₹{Math.round(item.landedCostPerKg || 0).toLocaleString('en-IN')}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                           </Table>
                        </ScrollArea>
                    </div>
                   )}
                </div>

                <DialogFooter className="pt-4">
                  <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>CANCEL</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (purchaseToEdit ? "SAVING..." : "ADDING...") : (purchaseToEdit ? "SAVE CHANGES" : "ADD PURCHASE")}
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
