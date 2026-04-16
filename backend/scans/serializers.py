from rest_framework import serializers
from .models import Scan


class DoctorInfoSerializer(serializers.Serializer):
    """Nested doctor info attached to each scan for admin view."""
    id = serializers.UUIDField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()


class ScanSerializer(serializers.ModelSerializer):
    doctor = DoctorInfoSerializer(source='user', read_only=True)

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
            'dicom_file',
            'model_file',
            'status',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'user',
            'doctor',
            'model_file',
            'status',
            'created_at',
            'updated_at',
        )
