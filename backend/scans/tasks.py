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

    tmp_dir = tempfile.mkdtemp(prefix='medtechprint_')
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

        # A valid STL has at least one triangle (80-byte header + 4-byte count + 50 bytes per triangle)
        stl_size = os.path.getsize(output_stl)
        if stl_size <= 84:
            raise RuntimeError(f"Conversion produced an empty mesh (file size {stl_size} bytes)")

        # Save STL to Django media storage
        with open(output_stl, 'rb') as f:
            scan.model_file.save(f'scan_{scan_id}.stl', ContentFile(f.read()), save=False)

        scan.status = 'COMPLETED'
        scan.save(update_fields=['status', 'model_file', 'updated_at'])
        print(f"[convert_scan_to_3d_sync] Scan {scan_id} → COMPLETED")

        # Email the doctor
        try:
            from django.core.mail import send_mail
            doctor = scan.user
            send_mail(
                subject=f'[MedTechPrint 3D] Case {scan.case_number} — 3D Model Ready',
                message=(
                    f'Dear Dr. {doctor.first_name} {doctor.last_name},\n\n'
                    f'Your case has been processed successfully.\n\n'
                    f'Case Number : {scan.case_number}\n'
                    f'Patient     : {scan.patient_name}\n'
                    f'Status      : Completed\n\n'
                    f'Log in to your dashboard to download the STL file and request a print.\n\n'
                    f'MedTechPrint 3D Team'
                ),
                from_email='noreply@medtechprint3d.com',
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


@shared_task
def cleanup_old_scans() -> str:
    """Delete scans (files + DB records) older than SCAN_RETENTION_DAYS."""
    from django.conf import settings
    from django.utils import timezone
    from datetime import timedelta
    from .models import Scan

    retention_days = getattr(settings, 'SCAN_RETENTION_DAYS', 270)
    cutoff = timezone.now() - timedelta(days=retention_days)
    old_scans = Scan.objects.filter(created_at__lt=cutoff)
    count = 0

    for scan in old_scans:
        for field in [scan.dicom_file, scan.model_file, scan.dev_model_file]:
            if field and field.name:
                try:
                    field.delete(save=False)
                except Exception:
                    pass
        for sf in scan.dicom_files.all():
            if sf.file and sf.file.name:
                try:
                    sf.file.delete(save=False)
                except Exception:
                    pass
        scan.delete()
        count += 1

    return f"Deleted {count} scans older than {retention_days} days"
