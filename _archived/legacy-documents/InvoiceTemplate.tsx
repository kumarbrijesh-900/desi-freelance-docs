interface InvoiceTemplateProps {
    clientName: string;
    projectType: string;
    fee: string;
    timeline: string;
  }
  
  export default function InvoiceTemplate({
    clientName,
    projectType,
    fee,
    timeline,
  }: InvoiceTemplateProps) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-black">Invoice</h2>
  
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
            <span className="font-semibold text-black">Fee:</span>{" "}
            {fee || "Not provided"}
          </p>
          <p>
            <span className="font-semibold text-black">Timeline:</span>{" "}
            {timeline || "Not provided"}
          </p>
        </div>
      </div>
    );
  }