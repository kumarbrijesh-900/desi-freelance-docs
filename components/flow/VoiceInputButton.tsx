"use client";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
}

export default function VoiceInputButton({
  onTranscript,
}: VoiceInputButtonProps) {
  const handleClick = () => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as typeof window & {
            webkitSpeechRecognition?: new () => {
              lang: string;
              start: () => void;
              onresult: ((event: {
                results: ArrayLike<ArrayLike<{ transcript: string }>>;
              }) => void) | null;
              onerror: ((event: { error: string }) => void) | null;
            };
          }).webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };

    recognition.onerror = () => {
      alert("Voice input failed. Please try again.");
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:border-black"
    >
      Use Voice Input
    </button>
  );
}