import { PlaceholderContent } from "@/components/PlaceholderContent";
import { Users2, UserCheck, Truck, UserCog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";


export default function MastersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Masters</h1>
          <p className="text-lg text-muted-foreground">Manage your core business entities.</p>
        </div>
      </div>

      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-12">
          <TabsTrigger value="suppliers" className="py-2 sm:py-3 text-base">
            <Truck className="w-5 h-5 mr-2" /> Suppliers
          </TabsTrigger>
          <TabsTrigger value="agents" className="py-2 sm:py-3 text-base">
            <UserCheck className="w-5 h-5 mr-2" /> Agents
          </TabsTrigger>
          <TabsTrigger value="transporters" className="py-2 sm:py-3 text-base">
            <UserCog className="w-5 h-5 mr-2" /> Transporters
          </TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Manage Suppliers</CardTitle>
              <CardDescription>Add, edit, and view supplier details.</CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderContent 
                title="Supplier Management" 
                description="This section to manage supplier master data is currently under development."
                icon={Truck}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="agents" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Manage Agents</CardTitle>
              <CardDescription>Add, edit, and view agent details.</CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderContent 
                title="Agent Management" 
                description="This section to manage agent master data is currently under development."
                icon={UserCheck}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="transporters" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Manage Transporters</CardTitle>
              <CardDescription>Add, edit, and view transporter details.</CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderContent 
                title="Transporter Management" 
                description="This section to manage transporter master data is currently under development."
                icon={UserCog}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* TODO: Implement MasterDataClient components for each tab */}
    </div>
  );
}
