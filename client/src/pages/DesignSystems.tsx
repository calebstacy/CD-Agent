import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Upload, Sparkles, Palette, Type, Box } from "lucide-react";

export default function DesignSystems() {
  const [isCreating, setIsCreating] = useState(false);
  const [newSystem, setNewSystem] = useState({ name: "", description: "" });
  const [documentText, setDocumentText] = useState("");

  const { data: systems, isLoading, refetch } = trpc.designSystems.list.useQuery();
  const createMutation = trpc.designSystems.create.useMutation({
    onSuccess: () => {
      toast.success("Design system created!");
      setIsCreating(false);
      setNewSystem({ name: "", description: "" });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const parseMutation = trpc.designSystems.parseDocument.useMutation({
    onSuccess: (data: any) => {
      toast.success("Document parsed successfully!");
      console.log("Parsed design system:", data);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!newSystem.name) {
      toast.error("Please enter a name");
      return;
    }
    createMutation.mutate(newSystem);
  };

  const handleParseDocument = (systemId: number) => {
    if (!documentText) {
      toast.error("Please paste your design system documentation");
      return;
    }
    parseMutation.mutate({ designSystemId: systemId, documentText });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Design Systems</h1>
          <p className="text-muted-foreground mt-2">
            Teach the AI your brand voice and component library for on-brand content generation
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              New Design System
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Design System</DialogTitle>
              <DialogDescription>
                Create a new design system to organize your brand guidelines and components
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Acme Design System"
                  value={newSystem.name}
                  onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your design system..."
                  value={newSystem.description}
                  onChange={(e) => setNewSystem({ ...newSystem, description: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Design System"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!systems || systems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sparkles className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No design systems yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first design system to teach the AI your brand voice, component library, and design tokens
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Design System
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {systems.map((system: any) => (
            <Card key={system.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  {system.name}
                </CardTitle>
                <CardDescription>{system.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                    <Type className="w-5 h-5 mb-1 text-muted-foreground" />
                    <span className="font-semibold">0</span>
                    <span className="text-xs text-muted-foreground">Voices</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                    <Box className="w-5 h-5 mb-1 text-muted-foreground" />
                    <span className="font-semibold">0</span>
                    <span className="text-xs text-muted-foreground">Components</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-muted rounded-lg">
                    <Sparkles className="w-5 h-5 mb-1 text-muted-foreground" />
                    <span className="font-semibold">0</span>
                    <span className="text-xs text-muted-foreground">Examples</span>
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Documentation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Upload Design System Documentation</DialogTitle>
                      <DialogDescription>
                        Paste your design system documentation, Figma export, or brand guidelines
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Textarea
                        placeholder="Paste your design system documentation here..."
                        className="min-h-[300px] font-mono text-sm"
                        value={documentText}
                        onChange={(e) => setDocumentText(e.target.value)}
                      />
                      <Button
                        onClick={() => handleParseDocument(system.id)}
                        disabled={parseMutation.isPending}
                        className="w-full"
                      >
                        {parseMutation.isPending ? "Parsing..." : "Parse Documentation"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="secondary" className="w-full" onClick={() => toast.info("Coming soon!")}>
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            How Design Systems Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold mb-2">1. Upload Guidelines</h4>
              <p className="text-sm text-muted-foreground">
                Upload your design system docs, Figma files, or brand guidelines. The AI will extract colors, typography,
                and components.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. Learn Brand Voice</h4>
              <p className="text-sm text-muted-foreground">
                Provide examples of your existing content. The AI analyzes tone, vocabulary, and patterns to match your
                brand.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3. Generate On-Brand</h4>
              <p className="text-sm text-muted-foreground">
                Select your design system when generating content. The AI respects your components, character limits, and
                brand voice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
