export async function synthesizeSpeech(
  text: string,
  googleKey: string
): Promise<string> {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: "en-US",
        name: "en-US-Journey-F",
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 0.9,
        pitch: 0,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TTS API error: ${err}`);
  }

  const data = (await response.json()) as { audioContent: string };
  return data.audioContent;
}
