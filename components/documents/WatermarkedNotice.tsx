interface WatermarkedNoticeProps {
    text?: string;
  }
  
  export default function WatermarkedNotice({
    text = "Generated with DesiFreelanceDocs Free",
  }: WatermarkedNoticeProps) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-center text-xs font-medium text-gray-500">
        {text}
      </div>
    );
  }