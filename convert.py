import os
import sys
import pydicom
import numpy as np
from PIL import Image

def main():
    if len(sys.argv) != 3:
        print("Usage: python convert.py <input_dcm> <output_png>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        ds = pydicom.dcmread(input_path, force=True)

        if 'PixelData' not in ds:
            print(f"No pixel data found in {input_path}", file=sys.stderr)
            sys.exit(1)

        arr = ds.pixel_array

        # Normalize pixel data to 8-bit range if needed
        if arr.dtype != np.uint8:
            arr = (arr - arr.min()) / (arr.max() - arr.min()) * 255
            arr = arr.astype(np.uint8)

        # Handle grayscale or RGB
        if len(arr.shape) == 2:
            img = Image.fromarray(arr)
        elif len(arr.shape) == 3:
            if arr.shape[0] in [3, 4]:  # Channels first (e.g., (3, H, W))
                arr = np.transpose(arr, (1, 2, 0))
            img = Image.fromarray(arr)
        else:
            print(f"Unsupported pixel array shape {arr.shape} in {input_path}", file=sys.stderr)
            sys.exit(1)

        img.save(output_path)

        if not os.path.exists(output_path):
            print(f"PNG file was not created: {output_path}", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"Conversion error: {input_path} => {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
