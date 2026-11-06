from django.urls import path
from . import views

urlpatterns = [
    path('analyze/', views.analyze),
    path('contributions/', views.contributions),
    path('contributions/<int:id>/', views.contribution_detail),
]