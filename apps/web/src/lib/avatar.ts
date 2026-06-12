export function getPrimaryAvatar(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  const urls = avatarUrl.split(',').filter(Boolean);
  return urls.length > 0 ? urls[0] : null;
}

export function getAllAvatars(avatarUrl: string | null | undefined): string[] {
  if (!avatarUrl) return [];
  return avatarUrl.split(',').filter(Boolean);
}

export function getThumbnailUrl(url: string, width = 250, height = 250, quality = 70): string {
  if (!url) return '';
  
  try {
    const parsedUrl = new URL(url);
    const filename = parsedUrl.pathname.split('/').pop();
    if (!filename) return url;
    
    // Always use the /api/ folder for thumb.php, regardless of where the image is stored
    const basePath = parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/'));
    
    // If the path contains profile_upload, we replace it with api
    const apiPath = basePath.replace('/profile_upload', '/api');
    
    return `${parsedUrl.origin}${apiPath}/thumb.php?file=${filename}&w=${width}&h=${height}&q=${quality}`;
  } catch (e) {
    return url;
  }
}
