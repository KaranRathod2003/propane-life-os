import { PageHeader } from "@/components/common/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalsSection } from "./components/GoalsSection";
import { EntriesSection } from "./components/EntriesSection";

export default function JournalPage() {
  return (
    <div>
      <PageHeader title="Journal" />
      <Tabs defaultValue="entries">
        <TabsList className="w-full">
          <TabsTrigger value="entries" className="flex-1">
            Entries
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex-1">
            Goals
          </TabsTrigger>
        </TabsList>
        <TabsContent value="entries">
          <EntriesSection />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
