/**
 * Uploads an image file to the server-side admin upload endpoint.
 * Bypasses browser CORS restrictions and client storage rules.
 */
export async function uploadAdminMedia(file: File, folder = "general"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.ok || !data.url) {
    throw new Error(data.error || "Upload failed");
  }

  return data.url as string;
}
