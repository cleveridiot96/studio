
import { PlaceholderContent } from "@/components/PlaceholderContent";
import { Users2, UserCheck, Truck, UserCog, Handshake, Users } from "lucide-react"; // Added Users for Customers, Handshake for Brokers
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

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-5 h-auto sm:h-12"> {/* Adjusted grid-cols for 5 tabs */}
          <TabsTrigger value="customers" className="py-2 sm:py-3 text-base">
            <Users className="w-5 h-5 mr-2" /> Customers
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="py-2 sm:py-3 text-base">
            <Truck className="w-5 h-5 mr-2" /> Suppliers
          </TabsTrigger>
          <TabsTrigger value="agents" className="py-2 sm:py-3 text-base">
            <UserCheck className="w-5 h-5 mr-2" /> Agents
          </TabsTrigger>
          <TabsTrigger value="transporters" className="py-2 sm:py-3 text-base">
            <UserCog className="w-5 h-5 mr-2" /> Transporters
          </TabsTrigger>
           <TabsTrigger value="brokers" className="py-2 sm:py-3 text-base">
            <Handshake className="w-5 h-5 mr-2" /> Brokers
          </TabsTrigger>
        </TabsList>
        <TabsContent value="customers" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Manage Customers</CardTitle>
              <CardDescription>Add, edit, and view customer details.</CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderContent 
                title="Customer Management" 
                description="This section to manage customer master data is currently under development."
                icon={Users}
              />
            </CardContent>
          </Card>
        </TabsContent>
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
              <CardDescription>Add, edit, and view agent details. Define commission rates here.</CardDescription>
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
        <TabsContent value="brokers" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Manage Brokers</CardTitle>
              <CardDescription>Add, edit, and view broker details. Define commission rates here.</CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderContent 
                title="Broker Management" 
                description="This section to manage broker master data is currently under development."
                icon={Handshake}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* TODO: Implement MasterDataClient components for each tab. These clients would use AddMasterItemDialog. */}
    </div>
  );
}
