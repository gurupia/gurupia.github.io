from PIL import Image
import sys

def make_transparent(input_path, output_path):
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        # Get the background color from the top-left pixel
        bg_color = datas[0]
        threshold = 30  # Tolerance for background color variation
        
        new_data = []
        for item in datas:
            # Check if the pixel is close to the background color
            if all(abs(item[i] - bg_color[i]) < threshold for i in range(3)):
                new_data.append((255, 255, 255, 0))  # Transparent
            else:
                new_data.append(item)
                
        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Successfully saved transparent image to {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    make_transparent("mascot_spritesheet.png", "mascot.png")
