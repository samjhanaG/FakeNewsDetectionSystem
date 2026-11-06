import os
import logging
import traceback
from urllib.parse import urlparse

import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import SubmittedNews
from .model import ml_utils
from .model.ml_utils import (
    preprocess_text as clean_text,
    extract_article_text_from_url,
    reload_model_and_vectorizer,
    trusted_domains,
    DATA_DIR,
)

logger = logging.getLogger(__name__)
reload_model_and_vectorizer()


def _label(pred):
    return "True" if pred == 1 else "Fake"


def _is_trusted(domain):
    domain = domain.lower().split(':')[0]
    if domain.startswith('www.'):
        domain = domain[4:]
    for t in trusted_domains:
        t = t.lower().removeprefix('www.')
        if domain == t or domain.endswith('.' + t):
            return True
    return False


def _serialize(c):
    return {
        "id": c.id,
        "title": c.title,
        "content": c.content,
        "is_approved": c.is_approved,
        "created_at": c.created_at.isoformat(),
        "submitted_at": c.submitted_at.isoformat(),
    }


# ANALYZE (guest, no login) 

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def analyze(request):
    user_input = (request.data.get('user_input') or '').strip()
    method = (request.data.get('method') or '').strip()
    if method == 'text':
        method = 'input'

    if not user_input or not method:
        return Response({'error': 'Missing input or method.'}, status=400)

    # Always read from ml_utils so a retrain/reload is picked up immediately
    model, vectorizer = ml_utils.model, ml_utils.vectorizer
    if model is None or vectorizer is None:
        return Response({'error': 'Model or vectorizer not loaded.'}, status=500)

    try:
        # 1. Direct text
        if method == 'input':
            vect = vectorizer.transform([clean_text(user_input)])
            pred = model.predict(vect)[0]
            proba = model.predict_proba(vect)[0]
            return Response({
                "result": _label(pred),
                "confidence": round(float(max(proba)) * 100, 2),
                "article_text": user_input,
            })

        # 2. Dataset similarity
        if method == 'dataset':
            df_real = pd.read_csv(os.path.join(DATA_DIR, 'True.csv'), on_bad_lines='skip')
            df_fake = pd.read_csv(os.path.join(DATA_DIR, 'Fake.csv'), on_bad_lines='skip')
            df_real['label'] = 'True'
            df_fake['label'] = 'Fake'
            df = pd.concat(
                [df_real[['title', 'text', 'label']], df_fake[['title', 'text', 'label']]],
                ignore_index=True,
            )
            df['title'] = df['title'].fillna('')
            df['text'] = df['text'].fillna('')
            df['combined'] = (df['title'] + ' ' + df['text']).apply(clean_text)

            user_vector = vectorizer.transform([clean_text(user_input)])
            dataset_vectors = vectorizer.transform(df['combined'])
            scores = cosine_similarity(user_vector, dataset_vectors)[0]

            top_matches = []
            for idx in scores.argsort()[::-1][:5]:
                if scores[idx] < 0.01:
                    continue
                article_text = df.iloc[idx]['text']
                article_vector = vectorizer.transform([clean_text(article_text)])
                predicted = _label(model.predict(article_vector)[0])
                actual = df.iloc[idx]['label']
                top_matches.append({
                    'title': df.iloc[idx]['title'] or 'No Title',
                    'text': article_text[:300],
                    'predicted': predicted,
                    'actual': actual,
                    'similarity': round(float(scores[idx]), 3),
                    'correct': predicted == actual,
                })

            if top_matches:
                real_votes = sum(1 for a in top_matches if a['actual'] == 'True')
                fake_votes = sum(1 for a in top_matches if a['actual'] == 'Fake')
                if real_votes > fake_votes:
                    final = 'True'
                elif fake_votes > real_votes:
                    final = 'Fake'
                else:
                    final = _label(model.predict(user_vector)[0])
                return Response({
                    "result": f"{final} (based on similar articles)",
                    "article_text": user_input,
                    "articles": top_matches,
                    "found_matches": True,
                })

            return Response({
                "result": _label(model.predict(user_vector)[0]),
                "article_text": user_input,
                "articles": [],
                "found_matches": False,
            })

        # 3. URL
        if method == 'url':
            parsed = urlparse(user_input)
            if parsed.scheme not in ('http', 'https') or not parsed.netloc:
                return Response({'error': 'Enter a valid http(s) URL.'}, status=400)

            article_text = extract_article_text_from_url(user_input)

            if _is_trusted(parsed.netloc):
                return Response({
                    "result": "True (Trusted Source)",
                    "article_text": article_text or "No article content found.",
                })
            if article_text:
                vect = vectorizer.transform([clean_text(article_text)])
                return Response({
                    "result": _label(model.predict(vect)[0]),
                    "article_text": article_text,
                })
            return Response({
                "result": "Unable to analyze this URL",
                "article_text": "No article content found.",
            })

        return Response({'error': 'Invalid method. Use "text", "dataset" or "url".'}, status=400)

    except Exception as e:
        logger.error("analyze failed: %s", e)
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)


#  USER CONTRIBUTIONS (login required) 

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def contributions(request):
    if request.method == 'GET':
        qs = SubmittedNews.objects.filter(user=request.user).order_by('-created_at')
        return Response([_serialize(c) for c in qs])

    title = (request.data.get('title') or '').strip()
    content = (request.data.get('content') or request.data.get('text') or '').strip()
    if not content:
        return Response({'error': 'No text provided.'}, status=400)

    if not title:
        title = (content.split('.')[0] if '.' in content else content).strip()[:100]

    obj = SubmittedNews.objects.create(user=request.user, title=title, content=content)
    return Response({'message': 'News received!', 'contribution': _serialize(obj)}, status=201)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def contribution_detail(request, id):
    try:
        obj = SubmittedNews.objects.get(id=id, user=request.user)
    except SubmittedNews.DoesNotExist:
        return Response({'error': 'Contribution not found.'}, status=404)

    if request.method == 'DELETE':
        obj.delete()
        return Response({'message': 'Contribution deleted successfully.'})

    title = (request.data.get('title') or '').strip()
    content = (request.data.get('content') or '').strip()
    if not title or not content:
        return Response({'error': 'Title and content required.'}, status=400)

    obj.title = title
    obj.content = content
    obj.save()
    return Response({'message': 'Contribution updated successfully!', 'contribution': _serialize(obj)})