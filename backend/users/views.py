from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from rest_framework.views import APIView

from .serializers import (
    UserSerializer,
    LoginSerializer,
    RegisterSerializer,
    LoginUserSerializer,
    RefreshTokenSerializer,
)

User = get_user_model()

class LoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        """
        POST /api/auth/login
        Request: email, password
        Response: access, refresh, user (id, email, first_name, last_name, role)
        """
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': LoginUserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

class RegisterView(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)

class MeView(viewsets.ViewSet):
    permission_classes = (IsAuthenticated,)
    
    def list(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class LogoutView(viewsets.ViewSet):
    permission_classes = (IsAuthenticated,)
    
    def create(self, request):
        return Response(
            {'detail': 'Successfully logged out.'},
            status=status.HTTP_200_OK
        )

class RefreshTokenView(viewsets.ViewSet):
    permission_classes = (AllowAny,)
    
    def create(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh = RefreshToken(serializer.validated_data['refresh'])
        return Response({'access': str(refresh.access_token)}, status=status.HTTP_200_OK)
