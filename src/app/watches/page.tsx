"use client";

import { useCallback, useState } from "react";
import WatchList from "@/components/watches/WatchList";
import WatchForm from "@/components/watches/WatchForm";

export default function WatchesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Watches</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Scheduled monitoring for biotech data
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <WatchList
          onCreateClick={() => setFormOpen(true)}
          refreshKey={refreshKey}
        />
      </div>

      {formOpen && (
        <WatchForm
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </main>
  );
}
