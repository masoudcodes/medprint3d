"""
slicer_convert.py
-----------------
Pure-Python DICOM → STL conversion using pydicom + scikit-image.
No 3D Slicer installation required.

Steps:
  1. Load all DICOM slices from a directory (or single .dcm file)
  2. Sort slices by position and stack into a 3D volume
  3. Apply marching cubes at bone HU threshold (200 HU)
  4. Write output as binary STL
"""

import os
import sys
import struct
import numpy as np


def load_dicom_volume(dicom_dir: str):
    """Load and sort DICOM slices, return (volume_array, spacing)."""
    import pydicom

    files = []
    for root, _, filenames in os.walk(dicom_dir):
        for fname in filenames:
            fpath = os.path.join(root, fname)
            try:
                ds = pydicom.dcmread(fpath, stop_before_pixels=True)
                if hasattr(ds, 'SOPClassUID'):
                    files.append(fpath)
            except Exception:
                continue

    if not files:
        raise ValueError(f"No valid DICOM files found in {dicom_dir}")

    print(f"[Convert] Found {len(files)} DICOM file(s)")

    slices = []
    for fpath in files:
        try:
            ds = pydicom.dcmread(fpath)
            if hasattr(ds, 'PixelData'):
                slices.append(ds)
        except Exception:
            continue

    if not slices:
        raise ValueError("No DICOM slices with pixel data found")

    # Sort by ImagePositionPatient Z or InstanceNumber
    def sort_key(s):
        if hasattr(s, 'ImagePositionPatient'):
            return float(s.ImagePositionPatient[2])
        if hasattr(s, 'InstanceNumber'):
            return int(s.InstanceNumber)
        return 0

    slices.sort(key=sort_key)
    print(f"[Convert] Loaded {len(slices)} slices")

    # Get pixel spacing
    spacing_xy = [1.0, 1.0]
    spacing_z = 1.0

    if hasattr(slices[0], 'PixelSpacing'):
        spacing_xy = [float(slices[0].PixelSpacing[0]), float(slices[0].PixelSpacing[1])]

    if len(slices) > 1 and hasattr(slices[0], 'ImagePositionPatient') and hasattr(slices[1], 'ImagePositionPatient'):
        spacing_z = abs(float(slices[1].ImagePositionPatient[2]) - float(slices[0].ImagePositionPatient[2]))
        if spacing_z == 0:
            spacing_z = 1.0
    elif hasattr(slices[0], 'SliceThickness'):
        spacing_z = float(slices[0].SliceThickness) or 1.0

    # Decode each slice's pixel data once to avoid repeated decompression
    from collections import Counter
    pixel_arrays = {s: s.pixel_array for s in slices}

    # Filter to the most common slice shape (removes scouts/localizers with different dimensions)
    shape_counts = Counter(a.shape for a in pixel_arrays.values())
    dominant_shape = shape_counts.most_common(1)[0][0]
    slices = [s for s in slices if pixel_arrays[s].shape == dominant_shape]
    print(f"[Convert] Using {len(slices)} slices with shape {dominant_shape}")

    # Build volume
    volume = np.stack([pixel_arrays[s].astype(np.float32) for s in slices], axis=0)
    del pixel_arrays  # free memory before marching cubes

    # Apply rescale slope/intercept to get HU values
    slope = float(getattr(slices[0], 'RescaleSlope', 1))
    intercept = float(getattr(slices[0], 'RescaleIntercept', 0))
    volume = volume * slope + intercept

    print(f"[Convert] Volume shape: {volume.shape}, HU range: {volume.min():.0f} to {volume.max():.0f}")

    return volume, (spacing_z, spacing_xy[0], spacing_xy[1])


def volume_to_stl(volume: np.ndarray, spacing: tuple, output_stl: str, threshold: float = 200.0):
    """Apply marching cubes and write binary STL."""
    from skimage.measure import marching_cubes

    thresholds_to_try = [threshold, 150.0, 100.0]
    verts = faces = None
    for t in thresholds_to_try:
        print(f"[Convert] Running marching cubes at {t} HU threshold...")
        verts, faces, _, _ = marching_cubes(volume, level=t, spacing=spacing)
        print(f"[Convert] Mesh: {len(verts)} vertices, {len(faces)} faces")
        if len(faces) > 0:
            break
        print(f"[Convert] No surfaces at {t} HU, retrying with lower threshold...")

    if verts is None or len(faces) == 0:
        raise ValueError("No surfaces found at any threshold (200, 150, 100 HU)")

    # Write binary STL — vectorized: no Python loop over faces
    os.makedirs(os.path.dirname(os.path.abspath(output_stl)), exist_ok=True)

    v0 = verts[faces[:, 0]]
    v1 = verts[faces[:, 1]]
    v2 = verts[faces[:, 2]]

    normals = np.cross(v1 - v0, v2 - v0).astype(np.float32)
    lengths = np.linalg.norm(normals, axis=1, keepdims=True)
    lengths[lengths == 0] = 1.0
    normals /= lengths

    # Each triangle record: 12 floats (normal+v0+v1+v2) + 1 uint16 attribute = 50 bytes
    n_faces = len(faces)
    records = np.zeros(n_faces, dtype=[
        ('normal', np.float32, (3,)),
        ('v0',     np.float32, (3,)),
        ('v1',     np.float32, (3,)),
        ('v2',     np.float32, (3,)),
        ('attr',   np.uint16),
    ])
    records['normal'] = normals
    records['v0'] = v0.astype(np.float32)
    records['v1'] = v1.astype(np.float32)
    records['v2'] = v2.astype(np.float32)

    with open(output_stl, 'wb') as f:
        f.write(b'\0' * 80)
        f.write(struct.pack('<I', n_faces))
        f.write(records.tobytes())

    size_mb = os.path.getsize(output_stl) / (1024 * 1024)
    print(f"[Convert] STL written: {output_stl} ({size_mb:.1f} MB)")


def convert(dicom_dir: str, output_stl: str, threshold: float = 200.0):
    volume, spacing = load_dicom_volume(dicom_dir)
    volume_to_stl(volume, spacing, output_stl, threshold)


if __name__ == '__main__':
    try:
        sep = sys.argv.index('--')
        args = sys.argv[sep + 1:]
    except ValueError:
        args = sys.argv[1:]

    if len(args) < 2:
        print("Usage: python slicer_convert.py -- <dicom_dir> <output_stl>")
        sys.exit(1)

    convert(args[0], args[1])
