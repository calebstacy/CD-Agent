import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, Plus, Building2, Check, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface WorkspaceSwitcherProps {
  activeWorkspaceId: number | null;
  onWorkspaceChange: (workspaceId: number | null) => void;
}

export function WorkspaceSwitcher({ activeWorkspaceId, onWorkspaceChange }: WorkspaceSwitcherProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: "", slug: "", description: "" });
  
  const { data: workspaces, isLoading, refetch } = trpc.workspaces.list.useQuery();
  const createWorkspace = trpc.workspaces.create.useMutation({
    onSuccess: (result) => {
      refetch();
      onWorkspaceChange(result.id);
      setShowCreateDialog(false);
      setNewWorkspace({ name: "", slug: "", description: "" });
    },
  });

  const activeWorkspace = workspaces?.find(w => w.id === activeWorkspaceId);

  const handleNameChange = (name: string) => {
    setNewWorkspace({
      ...newWorkspace,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 px-3 py-2 h-auto text-left"
          >
            <div 
              className="w-6 h-6 rounded flex items-center justify-center text-xs"
              style={{ backgroundColor: activeWorkspace?.color || "#3b82f6" }}
            >
              {activeWorkspace?.icon || <Building2 className="w-4 h-4 text-white" />}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-neutral-200">
                {activeWorkspace?.name || "All Workspaces"}
              </span>
              {activeWorkspace?.description && (
                <span className="text-xs text-neutral-500 truncate max-w-[150px]">
                  {activeWorkspace.description}
                </span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-neutral-400 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-neutral-900 border-neutral-700">
          <DropdownMenuItem 
            onClick={() => onWorkspaceChange(null)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-6 h-6 rounded bg-neutral-700 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-neutral-400" />
            </div>
            <span>All Workspaces</span>
            {activeWorkspaceId === null && <Check className="w-4 h-4 ml-auto text-blue-500" />}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="bg-neutral-700" />
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
            </div>
          ) : workspaces && workspaces.length > 0 ? (
            workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => onWorkspaceChange(workspace.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center text-xs"
                  style={{ backgroundColor: workspace.color || "#3b82f6" }}
                >
                  {workspace.icon || workspace.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate">{workspace.name}</span>
                  {workspace.parentId && (
                    <span className="text-xs text-neutral-500">Inherits from parent</span>
                  )}
                </div>
                {workspace.id === activeWorkspaceId && (
                  <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-3 text-sm text-neutral-500 text-center">
              No workspaces yet
            </div>
          )}
          
          <DropdownMenuSeparator className="bg-neutral-700" />
          
          <DropdownMenuItem 
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 cursor-pointer text-blue-400"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-neutral-900 border-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-neutral-100">Create Workspace</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Create a new workspace for domain-specific content design knowledge.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-neutral-200">Name</Label>
              <Input
                id="name"
                value={newWorkspace.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Horizon, Instagram"
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-neutral-200">Slug</Label>
              <Input
                id="slug"
                value={newWorkspace.slug}
                onChange={(e) => setNewWorkspace({ ...newWorkspace, slug: e.target.value })}
                placeholder="horizon"
                className="bg-neutral-800 border-neutral-700 text-neutral-100"
              />
              <p className="text-xs text-neutral-500">
                URL-friendly identifier (lowercase, no spaces)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description" className="text-neutral-200">Description</Label>
              <Textarea
                id="description"
                value={newWorkspace.description}
                onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                placeholder="Content design knowledge for..."
                className="bg-neutral-800 border-neutral-700 text-neutral-100 resize-none"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setShowCreateDialog(false)}
              className="text-neutral-400"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => createWorkspace.mutate(newWorkspace)}
              disabled={!newWorkspace.name || !newWorkspace.slug || createWorkspace.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createWorkspace.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Workspace"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
