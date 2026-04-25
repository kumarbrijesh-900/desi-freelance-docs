import { supabase } from "./client";

/**
 * Uploads a file to the professional-assets bucket and returns the public URL.
 * Bucket name: professional-assets
 */
export async function uploadProfessionalAsset(
  file: File,
  path: string,
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.storage
      .from("professional-assets")
      .upload(path, file, {
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      // If bucket doesn't exist, this might fail.
      // In a real app, you'd create the bucket in the dashboard.
      return { url: null, error: error.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("professional-assets").getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err.message || "Unknown upload error" };
  }
}
