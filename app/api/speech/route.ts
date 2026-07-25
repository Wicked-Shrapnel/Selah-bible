import { NextResponse } from "next/server";

const CLOUD_VOICES = new Set([
  "en-US-AndrewNeural",
  "en-US-BrianNeural",
  "en-US-AvaNeural",
  "en-US-EmmaNeural",
]);

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" }[character] || character));
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { text?: string; voice?: string; rate?: number };
    const text = body.text?.trim();
    const voice = body.voice || "en-US-AndrewNeural";
    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    if (!text || text.length > 4000) return NextResponse.json({ error: "Text is required and must be under 4,000 characters." }, { status: 400 });
    if (!CLOUD_VOICES.has(voice)) return NextResponse.json({ error: "Unsupported Azure Speech voice." }, { status: 400 });
    if (!key || !region) return NextResponse.json({ error: "Azure Speech is not configured yet. Add AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to the site runtime." }, { status: 503 });

    const rate = typeof body.rate === "number" ? Math.max(0.7, Math.min(body.rate, 1.25)) : 1;
    const percent = `${Math.round((rate - 1) * 100)}%`;
    const ssml = `<speak version="1.0" xml:lang="en-US" xmlns="http://www.w3.org/2001/10/synthesis"><voice name="${voice}"><prosody rate="${percent}">${escapeXml(text)}</prosody></voice></speak>`;
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
        "User-Agent": "Selah Bible Reader",
      },
      body: ssml,
    });

    if (!response.ok) return NextResponse.json({ error: "Azure Speech could not synthesize this passage." }, { status: response.status >= 500 ? 502 : response.status });
    return new Response(await response.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to reach Azure Speech right now." }, { status: 500 });
  }
}
