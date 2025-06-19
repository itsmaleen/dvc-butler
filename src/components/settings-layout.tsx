import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import SettingsNav from "@/components/settings-nav";

interface SettingsLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export default function SettingsLayout({
  children,
  title,
  description,
}: SettingsLayoutProps) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 mb-4">
        <button
          onClick={() => router.history.back()}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        <h1 className="text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3">
            <div className="sticky top-6">
              <SettingsNav />
            </div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <div className="bg-card border rounded-lg shadow-sm p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
