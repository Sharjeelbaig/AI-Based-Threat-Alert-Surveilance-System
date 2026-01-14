/**
 * Captures a frame from the camera and returns it as a base64 string.
 * @param takePhoto - Function from react-camera-pro to capture a photo
 * @returns Base64 encoded image string or null if capture fails
 */
export function captureFrame(
  takePhoto: () => string | ImageData | null
): string | null {
  const photo = takePhoto();
  // react-camera-pro can return string (base64) or ImageData
  if (typeof photo === "string") {
    return photo;
  }
  return null;
}
