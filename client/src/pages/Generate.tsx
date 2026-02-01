import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, Star, BookMarked, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CONTENT_TYPES = [
  { value: "button", label: "Button Label" },
  { value: "error", label: "Error Message" },
  { value: "success", label: "Success Message" },
  { value: "empty_state", label: "Empty State" },
  { value: "form_label", label: "Form Label" },
  { value: "tooltip", label: "Tooltip" },
  { value: "navigation", label: "Navigation" },
  { value: "heading", label: "Heading" },
  { value: "description", label: "Description" },
  { value: "placeholder", label: "Placeholder" },
] as const;

const BRAND_VOICE_PRESETS = [
  { value: "friendly", label: "Friendly & Approachable" },
  { value: "professional", label: "Professional & Formal" },
  { value: "playful", label: "Playful & Fun" },
  { value: "serious", label: "Serious & Direct" },
  { value: "empathetic", label: "Empathetic & Supportive" },
  { value: "technical", label: "Technical & Precise" },
];

export default function Generate() {
  const [contentType, setContentType] = useState<string>("button");
  const [purpose, setPurpose] = useState("");
  const [context, setContext] = useState("");
  const [brandVoice, setBrandVoice] = useState("friendly");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateMutation = trpc.generate.create.useMutation({
    onSuccess: () => {
      toast.success("Content generated successfully!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate content");
    },
  });

  const toggleFavoriteMutation = trpc.generate.toggleFavorite.useMutation();
  const toggleLibraryMutation = trpc.generate.toggleLibrary.useMutation();

  const { data: usageData } = trpc.user.usage.useQuery();

  const handleGenerate = () => {
    if (!purpose.trim()) {
      toast.error("Please describe the purpose");
      return;
    }

    generateMutation.mutate({
      contentType: contentType as any,
      purpose,
      context: context || undefined,
      brandVoice,
    });
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleToggleFavorite = (generationId: number, isFavorite: boolean) => {
    toggleFavoriteMutation.mutate({
      generationId,
      isFavorite: !isFavorite,
    });
  };

  const handleToggleLibrary = (generationId: number, isInLibrary: boolean) => {
    toggleLibraryMutation.mutate({
      generationId,
      isInLibrary: !isInLibrary,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generate Content</h1>
        <p className="text-muted-foreground mt-2">
          Create high-quality UX copy with AI assistance
        </p>
      </div>

      {/* Usage indicator */}
      {usageData && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Usage this month</p>
                <p className="text-2xl font-bold">
                  {usageData.current} / {usageData.limit === Infinity ? "∞" : usageData.limit}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Plan: {usageData.tier}</p>
                {usageData.limit !== Infinity && (
                  <p className="text-sm text-muted-foreground">
                    {usageData.limit - usageData.current} remaining
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Content Details</CardTitle>
            <CardDescription>
              Describe what you need and we'll generate suggestions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contentType">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger id="contentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose *</Label>
              <Input
                id="purpose"
                placeholder="e.g., save user profile changes"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">Context (optional)</Label>
              <Textarea
                id="context"
                placeholder="e.g., This appears after the user edits their profile..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandVoice">Brand Voice</Label>
              <Select value={brandVoice} onValueChange={setBrandVoice}>
                <SelectTrigger id="brandVoice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_VOICE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>Suggestions</CardTitle>
            <CardDescription>
              {generateMutation.data
                ? "Choose the best option for your needs"
                : "Generated suggestions will appear here"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generateMutation.isPending ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : generateMutation.data ? (
              <div className="space-y-4">
                {generateMutation.data.generation?.suggestions.map((suggestion: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-lg font-medium flex-1">{suggestion.copy}</p>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleCopy(suggestion.copy, index)}
                            >
                              {copiedIndex === index ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handleToggleFavorite(
                                  generateMutation.data.generation!.id,
                                  false
                                )
                              }
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handleToggleLibrary(
                                  generateMutation.data.generation!.id,
                                  false
                                )
                              }
                            >
                              <BookMarked className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {suggestion.rationale}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Fill in the details and click Generate to see suggestions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
