"""
scans/tasks.py
--------------
Celery background task that converts an uploaded DICOM file to a 3D STL
model by calling 3D Slicer headlessly.

Prerequisites (local machine):
  - 3D Slicer installed
  - SLICER_PATH set in .env pointing to the Slicer executable
  - Redis running  (celery broker)
  - Celery worker running: celery -A config worker --loglevel=info
"""

import os
import shutil
import subprocess
import tempfile
import zipfile

from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile


@shared_task(bind=True, max_retries=0)
def convert_scan_to_3d(self, scan_id: str) -> None:
    """
    1. Mark scan as PROCESSING
    2. Prepare DICOM directory (handle single .dcm or .zip of series)
    3. Call Slicer headlessly with slicer_convert.py
    4. Save the output STL to scan.model_file
    5. Mark scan as COMPLETED (or FAILED on error)
    """
    from .models import Scan  # local import to avoid circular import

    try:
        scan = Scan.objects.get(id=scan_id)
    except Scan.DoesNotExist:
        return

    # ------------------------------------------------------------------ #
    # Mark as processing immediately so the UI updates
    # ------------------------------------------------------------------ #
    scan.status = 'PROCESSING'
    scan.save(update_fields=['status', 'updated_at'])

    tmp_dir = tempfile.mkdtemp(prefix='medprint_')
    try:
        dicom_path = scan.dicom_file.path
        ext = os.path.splitext(dicom_path)[1].lower()
        dicom_dir = os.path.join(tmp_dir, 'dicom')
        os.makedirs(dicom_dir, exist_ok=True)

        # ------------------------------------------------------------------ #
        # Prepare DICOM input directory
        # ------------------------------------------------------------------ #
        if ext == '.zip':
            # Zip archive of a DICOM series — extract into dicom_dir
            with zipfile.ZipFile(dicom_path, 'r') as zf:
                zf.extractall(dicom_dir)
        else:
            # Single .dcm file — copy into dicom_dir so Slicer can scan the folder
            shutil.copy2(dicom_path, dicom_dir)

        # ------------------------------------------------------------------ #
        # Paths
        # ------------------------------------------------------------------ #
        output_stl = os.path.join(tmp_dir, f'scan_{scan_id}.stl')
        script_path = os.path.join(os.path.dirname(__file__), 'slicer_convert.py')
        slicer_exe = settings.SLICER_PATH

        if not os.path.exists(slicer_exe):
            raise FileNotFoundError(
                f"Slicer executable not found at: {slicer_exe}\n"
                f"Set SLICER_PATH in your .env file."
            )

        # ------------------------------------------------------------------ #
        # Run Slicer headlessly
        # Timeout: 10 minutes — large CT series can take a while
        # ------------------------------------------------------------------ #
        cmd = [
            slicer_exe,
            '--no-main-window',
            '--python-script', script_path,
            '--', dicom_dir, output_stl,
        ]

        result = subprocess.run(
            cmd,
            timeout=600,
            capture_output=True,
            text=True,
        )

        # Log output for debugging
        if result.stdout:
            print(f"[Slicer stdout]\n{result.stdout}")
        if result.stderr:
            print(f"[Slicer stderr]\n{result.stderr}")

        if result.returncode != 0 or not os.path.exists(output_stl):
            raise RuntimeError(
                f"Slicer exited with code {result.returncode}.\n"
                f"stderr: {result.stderr[-500:]}"
            )

        # ------------------------------------------------------------------ #
        # Save STL to scan.model_file (Django stores in media/scans/models/)
        # ------------------------------------------------------------------ #
        with open(output_stl, 'rb') as f:
            stl_filename = f'scans/models/scan_{scan_id}.stl'
            scan.model_file.save(stl_filename, ContentFile(f.read()), save=False)

        scan.status = 'COMPLETED'
        scan.save(update_fields=['status', 'model_file', 'updated_at'])
        print(f"[convert_scan_to_3d] Scan {scan_id} → COMPLETED")

    except Exception as exc:
        scan.status = 'FAILED'
        scan.save(update_fields=['status', 'updated_at'])
        print(f"[convert_scan_to_3d] Scan {scan_id} → FAILED: {exc}")
        raise  # re-raise so Celery records the failure

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
