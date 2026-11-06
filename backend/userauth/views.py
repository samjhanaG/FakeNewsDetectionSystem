import logging

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def _user_payload(user):
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_staff": bool(user.is_staff or user.is_superuser),
    }


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def register(request):
    fname = (request.data.get('fname') or '').strip()
    lname = (request.data.get('lname') or '').strip()
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''

    if not fname or not lname or not email or not password:
        return Response({'error': 'All fields are required.'}, status=400)

    if User.objects.filter(username__iexact=email).exists() or User.objects.filter(email__iexact=email).exists():
        return Response({'error': 'User with this email already exists.'}, status=400)

    try:
        validate_password(password)
    except ValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=400)

    user = User.objects.create_user(
        username=email, email=email, password=password,
        first_name=fname, last_name=lname,
    )
    logger.info("User created: id=%s", user.id)
    return Response({'message': 'User registered successfully!'}, status=201)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login(request):
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''

    if not email or not password:
        return Response({'error': 'Email and password required.'}, status=400)

    user_obj = User.objects.filter(email__iexact=email).first()
    user = authenticate(username=user_obj.username, password=password) if user_obj else None
    if user is None:
        return Response({'error': 'Invalid email or password.'}, status=401)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({'message': 'Login successful', 'token': token.key, 'user': _user_payload(user)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    if request.auth:
        request.auth.delete()
    return Response({'message': 'Logged out.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(_user_payload(request.user))


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def forgot_password(request):
    # TODO: actually send a reset email. Same response either way so emails can't be probed.
    return Response({'message': 'If the account exists, a reset email has been sent.'})