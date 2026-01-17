import axios from "axios";
const API_URL = "http://localhost:3000"; 
export async function sendAlert(imageData: string) {
  try {
    const response = await axios.post(`${API_URL}/alert-system`, {
      imageBase64: imageData,
    });
    return response.data;
  } catch (error) {
    console.error("Error sending alert:", error);
    throw error;
  }
} 