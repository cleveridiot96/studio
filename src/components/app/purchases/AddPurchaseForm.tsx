
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
import type { MasterItem, Purchase, MasterItemType, PurchaseItem, Agent } from "@/lib/types";
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
        transportCharges: purchaseToEdit.transportCharges,
        packingCharges: purchaseToEdit.packingCharges,
        labourCharges: purchaseToEdit.labourCharges,
        commissionType: purchaseToEdit.commissionType,
        commission: purchaseToEdit.commission,
        miscExpenses: purchaseToEdit.miscExpenses,
      };
    }
    return {
      date: new Date(),
      locationId: undefined,
      supplierId: undefined,
      agentId: undefined,
      transporterId: undefined,
      items: [{ lotNumber: "", quantity: undefined, netWeight: undefined, rate: undefined }],
      transportCharges: undefined,
      packingCharges: undefined,
      labourCharges: undefined,
      commissionType: undefined,
      commission: undefined,
      miscExpenses: undefined,
    };
  }, [purchaseToEdit]);

  const methods = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema(suppliers, agents, warehouses, transporters, expenses)),
    defaultValues: getDefaultValues(),
    mode: 'onChange', 
  });
  const { control, watch, setValue, handleSubmit: formHandleSubmit, reset, formState: { errors } } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedFormValues = watch();
  
  const summary = React.useMemo(() => {
    const { 
        items, agentId, commissionType, commission, 
        transportCharges, packingCharges, labourCharges, miscExpenses 
    } = watchedFormValues;

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

    const calculatedBrokerageCharges = (() => {
      if (!agentId || commission === undefined || commission < 0) return 0;
      if (commissionType === "Percentage") return totalGoodsValue * (commission / 100);
      if (commissionType === "Fixed") return commission;
      return 0;
    })();

    const totalNonBrokerageExpenses = (Number(transportCharges) || 0) + (Number(packingCharges) || 0) + (Number(labourCharges) || 0) + (Number(miscExpenses) || 0);
    const totalExpenses = totalNonBrokerageExpenses + calculatedBrokerageCharges;
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
        calculatedBrokerageCharges,
        itemsWithLandedCost,
    };
  }, [watchedFormValues]);

  React.useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues());
      setManualNetWeight({});
    }
  }, [purchaseToEdit, isOpen, reset, getDefaultValues]);
  
  const handleAgentChange = (agentId: string | undefined) => {
    setValue("agentId", agentId, { shouldValidate: true });
    if (agentId) {
        const agent = agents.find(a => a.id === agentId);
        setValue("commissionType", agent?.commissionType, { shouldValidate: true });
        setValue("commission", agent?.commission, { shouldValidate: true });
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
    if (type === 'Supplier') itemToEdit = suppliers.find(i => i.id === id) || null;
    else if (type === 'Agent') itemToEdit = agents.find(i => i.id === id) || null;
    else if (type === 'Warehouse') itemToEdit = warehouses.find(i => i.id === id) || null;
    else if (type === 'Transporter') itemToEdit = transporters.find(i => i.id === id) || null;
    else if (type === 'Expense') itemToEdit = expenses.find(i => i.id === id) || null;

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
        if (newItem.type === 'Agent') methods.setValue('agentId', newItem.id, { shouldValidate: true });
        if (newItem.type === 'Warehouse') methods.setValue('locationId', newItem.id, { shouldValidate: true });
        if (newItem.type === 'Transporter') methods.setValue('transporterId', newItem.id, { shouldValidate: true });
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
      totalGoodsValue: Math.round(summary.totalGoodsValue),
      totalQuantity: Math.round(summary.totalQuantity),
      totalNetWeight: summary.totalNetWeight,
      transportCharges: values.transportCharges ? Math.round(values.transportCharges) : undefined,
      packingCharges: values.packingCharges ? Math.round(values.packingCharges) : undefined,
      labourCharges: values.labourCharges ? Math.round(values.labourCharges) : undefined,
      commissionType: values.commissionType,
      commission: values.commission,
      brokerageCharges: Math.round(summary.calculatedBrokerageCharges),
      miscExpenses: values.miscExpenses ? Math.round(values.miscExpenses) : undefined,
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
                              onChange={handleAgentChange}
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
                  {watchedFormValues.agentId && (
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-4 pt-4 border-t">
                        <div className="font-medium text-sm md:col-span-1 pt-7 text-muted-foreground">COMMISSION DETAILS:</div>
                        <FormField control={control} name="commissionType" render={({ field }) => (
                              <FormItem><FormLabel>COMMISSION TYPE</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="TYPE" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="Fixed">FIXED (₹)</SelectItem>
                                    <SelectItem value="Percentage">%</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                        <FormField control={control} name="commission" render={({ field }) => (
                              <FormItem><FormLabel>COMMISSION VALUE</FormLabel>
                                <div className="relative">
                                  <FormControl><Input type="number" step="0.01" placeholder="VALUE" {...field} value={field.value ?? ''}
                                    onChange={e => { field.onChange(parseFloat(e.target.value) || undefined); }}
                                    className={watchedFormValues.commissionType === 'Percentage' ? "pr-8" : ""}
                                  /></FormControl>
                                  {watchedFormValues.commissionType === 'Percentage' && <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )} />
                         {summary.calculatedBrokerageCharges > 0 && (
                              <div className="text-sm text-muted-foreground pt-7">
                                  = ₹{Math.round(summary.calculatedBrokerageCharges).toLocaleString('en-IN')}
                              </div>
                          )}
                     </div>
                  )}
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                     <FormField control={control} name="transporterId" render={({ field }) => (
                      <FormItem className="col-span-full sm:col-span-2"><FormLabel>TRANSPORTER</FormLabel>
                        <MasterDataCombobox value={field.value} onChange={field.onChange} 
                          options={transporters.filter(t => t.type === 'Transporter').map((t) => ({ value: t.id, label: t.name }))}
                          placeholder="SELECT TRANSPORTER" addNewLabel="ADD NEW TRANSPORTER" onAddNew={() => handleOpenMasterForm("Transporter")}
                          onEdit={(id) => handleEditMasterItem("Transporter", id)}
                        />
                        <FormMessage />
                      </FormItem>)} />
                     <FormField control={control} name="transportCharges" render={({ field }) => (<FormItem><FormLabel>TRANSPORT (₹)</FormLabel><FormControl><Input type="number" step="1" placeholder="E.G. 5000" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="packingCharges" render={({ field }) => (<FormItem><FormLabel>PACKING (₹)</FormLabel><FormControl><Input type="number" step="1" placeholder="E.G. 500" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="labourCharges" render={({ field }) => (<FormItem><FormLabel>LABOUR (₹)</FormLabel><FormControl><Input type="number" step="1" placeholder="E.G. 300" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="miscExpenses" render={({ field }) => (<FormItem><FormLabel>MISC. EXP (₹)</FormLabel><FormControl><Input type="number" step="1" placeholder="E.G. 150" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>)} />
                   </div>
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
