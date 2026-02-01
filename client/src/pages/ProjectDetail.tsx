import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function ProjectDetail({ projectId }: { projectId: number }) {
  const { data: project, isLoading } = trpc.projects.get.useQuery({ id: projectId });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        {project.description && <p className="text-muted-foreground mt-2">{project.description}</p>}
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Project content coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
