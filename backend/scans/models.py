from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Scan(models.Model):
    SCAN_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scans')
    case_number = models.CharField(max_length=100, unique=True)
    patient_name = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True, help_text='Doctor specifications and printing requirements')
    dicom_file = models.FileField(upload_to='scans/dicom/')
    model_file = models.FileField(upload_to='scans/models/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=SCAN_STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
