import CreateDocumentWizard from "@/components/flow/CreateDocumentWizard";

export default function CreatePage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-black">Create New Document</h1>
        <CreateDocumentWizard />
      </div>
    </main>
  );
}