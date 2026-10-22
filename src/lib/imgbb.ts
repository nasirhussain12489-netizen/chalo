/**
 * ImgBB Image Storage Integration
 * Configured with user API key: 7443bf294f338b5a0c690e7de1fc2acd
 * All images uploaded across the application are hosted on ImgBB.
 */

export const DEFAULT_IMGBB_API_KEY = '7443bf294f338b5a0c690e7de1fc2acd';

export interface ImgBBUploadResult {
  success: boolean;
  url: string;
  displayUrl: string;
  thumbUrl?: string;
  deleteUrl?: string;
  fileName?: string;
  size?: number;
  error?: string;
}

/**
 * Uploads an image (base64 string, data URL, or Buffer) to ImgBB.
 * If ImgBB is unreachable or fails, falls back gracefully.
 */
export async function uploadToImgBB(
  input: string | Buffer,
  fileName: string = 'image.png',
  apiKey: string = process.env.IMGBB_API_KEY || DEFAULT_IMGBB_API_KEY
): Promise<ImgBBUploadResult> {
  const activeKey = apiKey || DEFAULT_IMGBB_API_KEY;

  try {
    let base64Data: string;

    if (Buffer.isBuffer(input)) {
      base64Data = input.toString('base64');
    } else if (typeof input === 'string') {
      // Strip data:image/...;base64, prefix if present
      if (input.includes('base64,')) {
        base64Data = input.split('base64,')[1];
      } else {
        base64Data = input;
      }
    } else {
      throw new Error('Invalid image payload provided to ImgBB uploader.');
    }

    // Clean filename
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'ilm_upload';

    const formData = new FormData();
    formData.append('image', base64Data);
    formData.append('name', cleanName);

    const uploadUrl = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(activeKey)}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const json = await response.json();

    if (response.ok && json.success && json.data) {
      return {
        success: true,
        url: json.data.url,
        displayUrl: json.data.display_url || json.data.url,
        thumbUrl: json.data.thumb?.url,
        deleteUrl: json.data.delete_url,
        fileName: json.data.image?.filename || cleanName,
        size: json.data.size,
      };
    }

    const errorMessage = json?.error?.message || json?.status_txt || 'ImgBB upload rejected';
    console.warn(`ImgBB upload warning (${errorMessage}), falling back...`);
    return {
      success: false,
      url: '',
      displayUrl: '',
      error: errorMessage,
    };
  } catch (err: any) {
    console.error('Error in uploadToImgBB:', err);
    return {
      success: false,
      url: '',
      displayUrl: '',
      error: err.message || 'Network error while uploading to ImgBB',
    };
  }
}
