import { Hono } from "hono";
import { analyzeFrame } from "./service";

const alertSystemApp = new Hono();

alertSystemApp.post("/", async (c) => {
  const { imageBase64 } = await c.req.json();
  const { frameDescription, audio } = await analyzeFrame(imageBase64);
  console.log("Frame description:", frameDescription);
  console.log("Audio size (bytes):", audio?.byteLength);
  console.log("Audio itself:", audio);
  return c.json( {frameDescription, audio} );
});

export default alertSystemApp;