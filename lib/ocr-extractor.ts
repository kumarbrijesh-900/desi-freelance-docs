const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read image file."));
    };

    reader.onerror = () => {
      reject(new Error("Could not read image file."));
    };

    reader.readAsDataURL(file);
  });
}

export async function extractTextFromImage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Unsupported image type. Please upload a PNG or JPG image.");
  }

  const imageDataUrl = await fileToDataUrl(file);
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");

  try {
    const result = await worker.recognize(imageDataUrl);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}
