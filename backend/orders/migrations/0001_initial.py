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
            name='Order',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='orders',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('service', models.CharField(
                    choices=[
                        ('ANATOMICAL_MODEL', 'CT to anatomical models'),
                        ('MAXILLOFACIAL', 'Maxillofacial reconstruction'),
                        ('TITANIUM_PLATE', 'Titanium plate pre-bending'),
                        ('CRANIOPLASTY', 'Cranioplasty reconstruction'),
                        ('OSTEOTOMY', 'Osteotomy surgical guides'),
                        ('IMPLANTS', 'Cranial & maxillofacial implants'),
                    ],
                    max_length=50,
                )),
                ('status', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('PROCESSING', 'Processing'),
                        ('READY', 'Ready for shipping'),
                        ('SHIPPED', 'Shipped'),
                        ('DELIVERED', 'Delivered'),
                        ('CANCELLED', 'Cancelled'),
                    ],
                    default='PENDING',
                    max_length=20,
                )),
                ('notes', models.TextField(blank=True)),
                ('price', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
