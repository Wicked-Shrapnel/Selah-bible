export async function POST() {
  return new Response(JSON.stringify({
    error: "Cloud TTS is disabled in this build. Use installed browser voices or local audio files under public/audio.",
  }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  });
}
