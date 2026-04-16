from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Scan
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
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def upload(self, request):
        if 'dicom_file' not in request.FILES:
            return Response(
                {'error': 'No DICOM file provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
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

    @action(detail=True, methods=['post'], url_path='convert')
    def convert(self, request, pk=None):
        """
        Admin triggers DICOM → 3D STL conversion for a scan.
        Queues a Celery task that calls 3D Slicer headlessly.
        Returns immediately — poll GET /api/scans/{id}/ for status updates.
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

        from .tasks import convert_scan_to_3d
        convert_scan_to_3d.delay(str(scan.id))

        # Optimistically mark as PROCESSING so the UI updates immediately
        scan.status = 'PROCESSING'
        scan.save(update_fields=['status', 'updated_at'])

        return Response(ScanSerializer(scan).data, status=status.HTTP_202_ACCEPTED)
