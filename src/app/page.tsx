import QueryBuilder from "@/components/QueryBuilder";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Ember Bio</h1>
          <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
            Biosimilar opportunity discovery platform
          </p>
        </div>
        <QueryBuilder />
      </div>
    </main>
  );
}
