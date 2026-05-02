import Chat from "@/components/Chat";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold">Ember Bio</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Biotech data intelligence
          </p>
        </div>
      </header>
      <Chat />
    </main>
  );
}
