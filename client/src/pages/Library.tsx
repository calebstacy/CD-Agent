import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, BookMarked } from "lucide-react";

export default function Library() {
  const { data: library, isLoading } = trpc.generate.library.useQuery();

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Library</h1>
        <p className="text-muted-foreground mt-2">Your saved content generations</p>
      </div>

      {library && library.length > 0 ? (
        <div className="space-y-4">
          {library.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <p className="font-medium">{item.contentType}</p>
                <p className="text-sm text-muted-foreground">{item.purpose}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookMarked className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No saved content yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
