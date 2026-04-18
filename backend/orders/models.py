from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Order(models.Model):
    SERVICE_CHOICES = (
        ('ANATOMICAL_MODEL', 'CT to anatomical models'),
        ('MAXILLOFACIAL', 'Maxillofacial reconstruction'),
        ('TITANIUM_PLATE', 'Titanium plate pre-bending'),
        ('CRANIOPLASTY', 'Cranioplasty reconstruction'),
        ('OSTEOTOMY', 'Osteotomy surgical guides'),
        ('IMPLANTS', 'Cranial & maxillofacial implants'),
    )
    
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('READY', 'Ready for shipping'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    scan = models.ForeignKey('scans.Scan', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    service = models.CharField(max_length=50, choices=SERVICE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Order {self.id} - {self.service}"
