from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Scan, ScanFile
from .serializers import ScanSerializer


class ScanViewSet(viewsets.ModelViewSet):
    serializer_class = ScanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Admins see every scan; optionally filter by doctor_id query param
        if user.role == 'ADMIN':
            qs = Scan.objects.select_related('user').all()
            doctor_id = self.request.query_params.get('doctor_id')
            if doctor_id:
                qs = qs.filter(user__id=doctor_id)
            return qs

        # Doctors (and any other role) see only their own scans
        return Scan.objects.filter(user=user)

    def perform_create(self, serializer):
        scan = serializer.save(user=self.request.user)
        for f in self.request.FILES.getlist('dicom_files'):
            ScanFile.objects.create(scan=scan, file=f)

    @action(detail=False, methods=['post'])
    def upload(self, request):
        if 'dicom_file' not in request.FILES:
            return Response(
                {'error': 'No DICOM file provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            scan = serializer.save(user=request.user)
            # Save any additional DICOM files
            for f in request.FILES.getlist('dicom_files'):
                ScanFile.objects.create(scan=scan, file=f)
            return Response(self.get_serializer(scan).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Allow admins to update scan status (PROCESSING, COMPLETED, FAILED)."""
        if request.user.role != 'ADMIN':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        scan = self.get_object()
        new_status = request.data.get('status')
        valid = [s[0] for s in Scan.SCAN_STATUS_CHOICES]
        if new_status not in valid:
            return Response(
                {'error': f'Invalid status. Choose from: {valid}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        scan.status = new_status
        scan.save(update_fields=['status', 'updated_at'])
        return Response(ScanSerializer(scan).data)

    @action(detail=True, methods=['patch'], url_path='upload-dev-model')
    def upload_dev_model(self, request, pk=None):
        """Admin uploads an edited/development-ready STL for the doctor to preview."""
        if request.user.role != 'ADMIN':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if 'dev_model_file' not in request.FILES:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        scan = self.get_object()
        scan.dev_model_file = request.FILES['dev_model_file']
        scan.save(update_fields=['dev_model_file', 'updated_at'])
        return Response(ScanSerializer(scan).data)

    @action(detail=True, methods=['patch'], url_path='admin-notes')
    def admin_notes(self, request, pk=None):
        """Allow admins to write feedback/notes visible to the doctor."""
        if request.user.role != 'ADMIN':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        scan = self.get_object()
        scan.admin_notes = request.data.get('admin_notes', scan.admin_notes)
        scan.save(update_fields=['admin_notes', 'updated_at'])
        return Response(ScanSerializer(scan).data)

    @action(detail=True, methods=['post'], url_path='convert')
    def convert(self, request, pk=None):
        """
        Admin triggers DICOM → 3D STL conversion for a scan.
        Runs in a background thread so the response returns immediately.
        Poll GET /api/scans/{id}/ for status updates.
        """
        if request.user.role != 'ADMIN':
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        scan = self.get_object()

        if scan.status == 'PROCESSING':
            return Response(
                {'error': 'This scan is already being converted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not scan.dicom_file:
            return Response(
                {'error': 'No DICOM file attached to this scan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark as PROCESSING immediately so the UI updates
        scan.status = 'PROCESSING'
        scan.save(update_fields=['status', 'updated_at'])

        # Run conversion in a background thread (no Celery/Redis needed)
        import threading
        from .tasks import convert_scan_to_3d_sync
        thread = threading.Thread(target=convert_scan_to_3d_sync, args=(str(scan.id),), daemon=True)
        thread.start()

        return Response(ScanSerializer(scan).data, status=status.HTTP_202_ACCEPTED)
