from rest_framework import serializers
from .models import Scan, ScanFile


class DoctorInfoSerializer(serializers.Serializer):
    """Nested doctor info attached to each scan for admin view."""
    id = serializers.UUIDField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class ScanFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScanFile
        fields = ('id', 'file', 'uploaded_at')
        read_only_fields = ('id', 'uploaded_at')


class ScanSerializer(serializers.ModelSerializer):
    doctor = DoctorInfoSerializer(source='user', read_only=True)
    dicom_files = ScanFileSerializer(many=True, read_only=True)

    class Meta:
        model = Scan
        fields = (
            'id',
            'user',
            'doctor',
            'case_number',
            'patient_name',
            'title',
            'description',
            'notes',
            'admin_notes',
            'dicom_file',
            'dicom_files',
            'model_file',
            'dev_model_file',
            'status',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'user',
            'doctor',
            'dicom_files',
            'model_file',
            'dev_model_file',
            'status',
            'created_at',
            'updated_at',
        )
