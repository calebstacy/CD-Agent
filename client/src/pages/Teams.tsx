import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function Teams() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground mt-2">Collaborate with your team</p>
        </div>
        <Button onClick={() => toast("Team creation coming soon!")}>
          <Plus className="mr-2 h-4 w-4" />
          New Team
        </Button>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Team features coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
