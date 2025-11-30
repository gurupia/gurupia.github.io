import os
import json

def generate_playlist():
    music_dir = 'Music'
    playlist_file = os.path.join(music_dir, 'playlist.json')
    
    if not os.path.exists(music_dir):
        print(f"Error: '{music_dir}' directory not found.")
        return

    songs = []
    for filename in os.listdir(music_dir):
        if filename.lower().endswith('.mp3'):
            songs.append({
                "title": os.path.splitext(filename)[0],
                "artist": "Unknown",
                "file": filename
            })
    
    with open(playlist_file, 'w', encoding='utf-8') as f:
        json.dump(songs, f, indent=4, ensure_ascii=False)
    
    print(f"Successfully generated playlist.json with {len(songs)} songs.")

if __name__ == "__main__":
    generate_playlist()
