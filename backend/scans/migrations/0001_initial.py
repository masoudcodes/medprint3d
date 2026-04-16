from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Scan',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='scans',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('case_number', models.CharField(max_length=100, unique=True)),
                ('patient_name', models.CharField(max_length=255)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('notes', models.TextField(
                    blank=True,
                    help_text='Doctor specifications and printing requirements',
                )),
                ('dicom_file', models.FileField(upload_to='scans/dicom/')),
                ('model_file', models.FileField(blank=True, null=True, upload_to='scans/models/')),
                ('status', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('PROCESSING', 'Processing'),
                        ('COMPLETED', 'Completed'),
                        ('FAILED', 'Failed'),
                    ],
                    default='PENDING',
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
