"""
scans/tasks.py
--------------
DICOM → STL conversion using pure Python (pydicom + scikit-image).
No 3D Slicer installation required.
"""

import os
import shutil
import tempfile
import zipfile

from celery import shared_task
from django.core.files.base import ContentFile


def convert_scan_to_3d_sync(scan_id: str) -> None:
    """
    Run DICOM → STL conversion synchronously.
    Called in a background thread from the view — no Celery/Redis needed.
    """
    from .models import Scan
    from .slicer_convert import convert

    try:
        scan = Scan.objects.get(id=scan_id)
    except Scan.DoesNotExist:
        return

    tmp_dir = tempfile.mkdtemp(prefix='medprint_')
    try:
        dicom_path = scan.dicom_file.path
        ext = os.path.splitext(dicom_path)[1].lower()
        dicom_dir = os.path.join(tmp_dir, 'dicom')
        os.makedirs(dicom_dir, exist_ok=True)

        # Extract zip or copy single .dcm (primary file)
        if ext == '.zip':
            with zipfile.ZipFile(dicom_path, 'r') as zf:
                zf.extractall(dicom_dir)
        else:
            shutil.copy2(dicom_path, dicom_dir)

        # Also copy/extract any additional ScanFile objects
        from .models import ScanFile
        for sf in ScanFile.objects.filter(scan=scan):
            sf_path = sf.file.path
            sf_ext = os.path.splitext(sf_path)[1].lower()
            if sf_ext == '.zip':
                with zipfile.ZipFile(sf_path, 'r') as zf:
                    zf.extractall(dicom_dir)
            else:
                shutil.copy2(sf_path, dicom_dir)

        output_stl = os.path.join(tmp_dir, f'scan_{scan_id}.stl')

        # Run pure-Python conversion
        convert(dicom_dir, output_stl, threshold=200.0)

        if not os.path.exists(output_stl):
            raise RuntimeError("STL file was not produced")

        # Save STL to Django media storage
        with open(output_stl, 'rb') as f:
            stl_filename = f'scans/models/scan_{scan_id}.stl'
            scan.model_file.save(stl_filename, ContentFile(f.read()), save=False)

        scan.status = 'COMPLETED'
        scan.save(update_fields=['status', 'model_file', 'updated_at'])
        print(f"[convert_scan_to_3d_sync] Scan {scan_id} → COMPLETED")

        # Email the doctor
        try:
            from django.core.mail import send_mail
            doctor = scan.user
            send_mail(
                subject=f'[MedPrint 3D] Case {scan.case_number} — 3D Model Ready',
                message=(
                    f'Dear Dr. {doctor.first_name} {doctor.last_name},\n\n'
                    f'Your case has been processed successfully.\n\n'
                    f'Case Number : {scan.case_number}\n'
                    f'Patient     : {scan.patient_name}\n'
                    f'Status      : Completed\n\n'
                    f'Log in to your dashboard to download the STL file and request a print.\n\n'
                    f'MedPrint 3D Team'
                ),
                from_email='noreply@medprint3d.com',
                recipient_list=[doctor.email],
                fail_silently=True,
            )
            print(f"[convert_scan_to_3d_sync] Email sent to {doctor.email}")
        except Exception as mail_exc:
            print(f"[convert_scan_to_3d_sync] Email failed: {mail_exc}")

    except Exception as exc:
        scan.status = 'FAILED'
        scan.save(update_fields=['status', 'updated_at'])
        print(f"[convert_scan_to_3d_sync] Scan {scan_id} → FAILED: {exc}")

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@shared_task(bind=True, max_retries=0)
def convert_scan_to_3d(self, scan_id: str) -> None:
    """Celery task — delegates to the sync function."""
    convert_scan_to_3d_sync(scan_id)
