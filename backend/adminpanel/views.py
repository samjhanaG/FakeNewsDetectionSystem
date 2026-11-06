import csv
import os

import pandas as pd
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from detection.models import SubmittedNews
from detection.model.ml_utils import retrain_model
from detection.model.lr_model import reload_model


def append_news_to_csv(title, text, label):
    data_dir = os.path.join(settings.BASE_DIR, 'detection', 'data')
    csv_file = os.path.join(data_dir, f"{label}.csv")

    if not os.path.exists(csv_file):
        df = pd.DataFrame(columns=['title', 'text'])
    else:
        df = pd.read_csv(csv_file, delimiter=',', quotechar='"', on_bad_lines='skip')

    df = pd.concat([df, pd.DataFrame([{'title': title, 'text': text}])], ignore_index=True)
    df.to_csv(csv_file, index=False, quoting=csv.QUOTE_ALL)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_all_users(request):
    data = []
    for user in User.objects.all().prefetch_related('detection_submittednews'):
        data.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'fname': user.first_name,
            'lname': user.last_name,
            'contributions': [
                {
                    'id': c.id,
                    'title': c.title,
                    'content': c.content,
                    'is_approved': c.is_approved,
                    'created_at': c.created_at.isoformat(),
                    'submitted_at': c.submitted_at.isoformat(),
                }
                for c in user.detection_submittednews.all()
            ],
        })
    return Response(data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)
    if user == request.user:
        return Response({'error': 'You cannot delete yourself.'}, status=400)
    user.delete()
    return Response({'message': 'User deleted successfully.'})


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAdminUser])
def contribution_detail(request, contrib_id):
    try:
        contribution = SubmittedNews.objects.get(id=contrib_id)
    except SubmittedNews.DoesNotExist:
        return Response({'error': 'Contribution not found.'}, status=404)

    if request.method == 'DELETE':
        contribution.delete()
        return Response({'message': 'Contribution deleted successfully.'})

    title = (request.data.get('title') or '').strip()
    content = (request.data.get('content') or '').strip()
    if not title or not content:
        return Response({'error': 'Title and content are required.'}, status=400)

    contribution.title = title
    contribution.content = content
    contribution.save()
    return Response({'message': 'Contribution updated successfully.'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def approve_contribution(request, contrib_id, csv_type):
    if csv_type not in ('True', 'Fake'):
        return Response({'error': 'Invalid csv_type.'}, status=400)

    try:
        contribution = SubmittedNews.objects.get(id=contrib_id)
    except SubmittedNews.DoesNotExist:
        return Response({'error': 'Contribution not found.'}, status=404)

    if contribution.is_approved:
        return Response({'error': 'Already approved.'}, status=400)

    with transaction.atomic():
        contribution.is_approved = True
        contribution.save()
        append_news_to_csv(title=contribution.title, text=contribution.content, label=csv_type)
        retrain_model()
        reload_model()

    return Response({'message': f'Contribution approved and added to {csv_type}.csv'})