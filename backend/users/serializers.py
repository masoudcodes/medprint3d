from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'tenant_id', 'date_joined')
        read_only_fields = ('id', 'date_joined')

class LoginUserSerializer(serializers.ModelSerializer):
    """User shape returned by POST /api/auth/login."""

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'role')

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data['email']
        password = data['password']

        user = User.objects.filter(email=email).first()

        # Must not reveal whether email or password was wrong.
        if not user:
            raise AuthenticationFailed('Invalid credentials.')

        if not user.is_active:
            raise PermissionDenied('Account inactive.')

        if not user.check_password(password):
            raise AuthenticationFailed('Invalid credentials.')
        
        data['user'] = user
        return data

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'password', 'password2')
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user

class RefreshTokenSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate_refresh(self, value):
        try:
            RefreshToken(value)
        except Exception as e:
            raise AuthenticationFailed('Invalid or expired refresh token.') from e
        return value
