import av
import io
import os
import speech_recognition as sr

r = sr.Recognizer()
dir_path = r'C:\Users\Usuario\.gemini\antigravity-ide\brain\8fa83837-1dbc-4f60-89bf-2c2db0bbae0b\.user_uploaded'

files = [
    'uploaded_media_0_1790625677802.img',
    'uploaded_media_1_1790625677802.img',
    'uploaded_media_2_1790625677802.img'
]

results = []
for idx, fname in enumerate(files):
    fpath = os.path.join(dir_path, fname)
    if not os.path.exists(fpath):
        results.append(f"File not found: {fname}")
        continue
    try:
        container = av.open(fpath)
        out_bytes = io.BytesIO()
        out_container = av.open(out_bytes, mode='w', format='wav')
        out_stream = out_container.add_stream('pcm_s16le', rate=16000)
        
        in_stream = container.streams.audio[0]
        resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
        
        for packet in container.demux(in_stream):
            for frame in packet.decode():
                for resampled_frame in resampler.resample(frame):
                    for out_packet in out_stream.encode(resampled_frame):
                        out_container.mux(out_packet)
        for out_packet in out_stream.encode(None):
            out_container.mux(out_packet)
        out_container.close()
        container.close()
        
        out_bytes.seek(0)
        with sr.AudioFile(out_bytes) as source:
            audio_data = r.record(source)
            text = r.recognize_google(audio_data, language='es-CL')
            results.append(f"AUDIO_{idx+1}: {text}")
    except Exception as e:
        results.append(f"AUDIO_{idx+1} ERROR: {e}")

output_text = "\n\n".join(results)
print(output_text)
with open(r'c:\Users\Usuario\proyectopandastore20\scratch\transcription_result.txt', 'w', encoding='utf-8') as f:
    f.write(output_text)
