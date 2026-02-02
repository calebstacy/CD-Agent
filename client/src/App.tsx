import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Generate from "./pages/Generate";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Library from "./pages/Library";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import DesignSystems from "./pages/DesignSystems";
import Chat from "./pages/Chat";

function Router() {
  return (
    <Switch>
      {/* Main chat interface */}
      <Route path={"/"} component={Chat} />
      
      {/* Landing page (for marketing) */}
      <Route path={"/home"} component={Home} />
      
      {/* Dashboard routes - all protected */}
      <Route path={"/dashboard"}>
        <DashboardLayout>
          <Generate />
        </DashboardLayout>
      </Route>
      
      <Route path={"/generate"}>
        <DashboardLayout>
          <Generate />
        </DashboardLayout>
      </Route>
      
      <Route path={"/projects"}>
        <DashboardLayout>
          <Projects />
        </DashboardLayout>
      </Route>
      
      <Route path={"/projects/:id"}>
        {(params) => (
          <DashboardLayout>
            <ProjectDetail projectId={parseInt(params.id)} />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/library"}>
        <DashboardLayout>
          <Library />
        </DashboardLayout>
      </Route>
      
      <Route path={"/teams"}>
        <DashboardLayout>
          <Teams />
        </DashboardLayout>
      </Route>
      
      <Route path={"/teams/:id"}>
        {(params) => (
          <DashboardLayout>
            <TeamDetail teamId={parseInt(params.id)} />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/design-systems"}>
        <DashboardLayout>
          <DesignSystems />
        </DashboardLayout>
      </Route>
      
      {/* Chat interface - full screen, no dashboard layout */}
      <Route path={"/chat"} component={Chat} />
      
      <Route path={"/settings"}>
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </Route>
      
      <Route path={"/admin"}>
        <DashboardLayout>
          <AdminDashboard />
        </DashboardLayout>
      </Route>
      
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
