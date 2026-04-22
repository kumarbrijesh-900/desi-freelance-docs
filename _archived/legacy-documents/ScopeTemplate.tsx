interface ScopeTemplateProps {
    clientName: string;
    projectType: string;
    revisions: string;
    timeline: string;
    notes: string;
    licensingSummary: string;
  }
  
  export default function ScopeTemplate({
    clientName,
    projectType,
    revisions,
    timeline,
    notes,
    licensingSummary,
  }: ScopeTemplateProps) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-black">Scope / Proposal</h2>
  
        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <p>
            <span className="font-semibold text-black">Client Name:</span>{" "}
            {clientName || "Not provided"}
          </p>
          <p>
            <span className="font-semibold text-black">Project Type:</span>{" "}
            {projectType || "Not provided"}
          </p>
          <p>
            <span className="font-semibold text-black">Timeline:</span>{" "}
            {timeline || "Not provided"}
          </p>
          <p>
            <span className="font-semibold text-black">Revisions:</span>{" "}
            {revisions || "Not provided"}
          </p>
          <p>
            <span className="font-semibold text-black">Project Notes:</span>{" "}
            {notes || "Not provided"}
          </p>
          <p>
            <span className="font-semibold text-black">Licensing:</span>{" "}
            {licensingSummary || "Not provided"}
          </p>
        </div>
      </div>
    );
  }