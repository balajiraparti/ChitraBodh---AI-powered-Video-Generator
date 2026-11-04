import os
import base64
from sarvamai import SarvamAI
from dotenv import load_dotenv

load_dotenv()

def test_sarvam_tts():
    # 1. Initialize the client
    # Replace "YOUR_SARVAM_API_KEY" with your actual key or load from env vars
    api_key = os.getenv("SARVAM_API_KEY", "YOUR_SARVAM_API_KEY")
    client = SarvamAI(api_subscription_key=api_key)

    # 2. Configure TTS parameters
    text_to_speak = "Welcome to Sarvam AI! This is a test of the text to speech API."
    target_language = "en-IN"       # Use "hi-IN" for Hindi, "bn-IN" for Bengali, etc.
    speaker_voice = "shubh"         # Sarvam offers 30+ speakers (e.g., "shubh", "meera", "simran_en_customer")
    model_version = "bulbul:v3"     # Can also use "bulbul:v4-flash" for the latest low-latency version

    print(f"Generating audio for text: '{text_to_speak}'...")

    try:
        # 3. Call the API
        response = client.text_to_speech.convert(
            text=text_to_speak,
            language_code=target_language,
            model=model_version,
            speaker=speaker_voice,
            pace=1.0,           # Adjust speech rate (0.5 to 2.0)
            temperature=0.6     # Controls expressiveness (0.01 to 2.0)
        )

        # 4. The response contains base64 encoded audio strings. Decode and save it.
        audio_base64 = response.audios[0]
        audio_bytes = base64.b64decode(audio_base64)

        output_filename = "output.wav"
        with open(output_filename, "wb") as f:
            f.write(audio_bytes)

        print(f"Success! Audio saved to {output_filename}")

    except Exception as e:
        print(f"Failed to generate TTS. Error: {e}")

if __name__ == "__main__":
    test_sarvam_tts()
