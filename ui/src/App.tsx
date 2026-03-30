import { useState } from "react";
import "./App.css";
import { Toaster } from "@/components/ui/sonner";
import {
  Calendar,
  Upload,
  FolderOpen,
  Trash2,
  ClipboardList,
  BarChart3,
  Menu,
  X,
  FileStack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ReleasesPage from "./pages/ReleasesPage";
import UploadPage from "./pages/UploadPage";
import FilesPage from "./pages/FilesPage";
import DeletePage from "./pages/DeletePage";
import AuditLogPage from "./pages/AuditLogPage";
import OverviewPage from "./pages/OverviewPage";

type Page = "releases" | "upload" | "files" | "delete" | "audit" | "overview";

const navItems: { key: Page; label: string; icon: React.ReactNode }[] = [
  { key: "releases", label: "Releases", icon: <Calendar className="h-4 w-4" /> },
  { key: "upload", label: "Upload File", icon: <Upload className="h-4 w-4" /> },
  { key: "files", label: "File Browser", icon: <FolderOpen className="h-4 w-4" /> },
  { key: "delete", label: "Delete File", icon: <Trash2 className="h-4 w-4" /> },
  { key: "audit", label: "Audit Log", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
];

function App() {
  const [page, setPage] = useState<Page>("releases");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch (page) {
      case "releases":
        return <ReleasesPage />;
      case "upload":
        return <UploadPage />;
      case "files":
        return <FilesPage />;
      case "delete":
        return <DeletePage />;
      case "audit":
        return <AuditLogPage />;
      case "overview":
        return <OverviewPage />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-60" : "w-0 overflow-hidden"
        } transition-all duration-200 bg-white border-r border-zinc-200 flex flex-col`}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <FileStack className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-lg whitespace-nowrap">File Manager</span>
        </div>
        <Separator />
        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                page === item.key
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {item.icon}
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-zinc-200">
          <p className="text-xs text-zinc-400">File Version Management</p>
          <p className="text-xs text-zinc-400">v1.0.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <h2 className="font-semibold text-zinc-700">
            {navItems.find((n) => n.key === page)?.label}
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-6">{renderPage()}</main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}

export default App;
