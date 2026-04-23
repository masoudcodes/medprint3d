from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    RegisterView,
    MeView,
    LogoutView,
    RefreshTokenView,
    DoctorListView,
)

router = DefaultRouter()
router.register(r'register', RegisterView, basename='register')
router.register(r'me', MeView, basename='me')
router.register(r'logout', LogoutView, basename='logout')
router.register(r'refresh', RefreshTokenView, basename='refresh')

urlpatterns = [
    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('doctors/', DoctorListView.as_view(), name='doctor-list'),
] + router.urls
