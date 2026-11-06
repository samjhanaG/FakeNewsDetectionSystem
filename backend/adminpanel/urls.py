from django.urls import path
from . import views

urlpatterns = [
    path('users/', views.get_all_users),
    path('users/<int:user_id>/', views.delete_user),
    path('contributions/<int:contrib_id>/', views.contribution_detail),
    path('contributions/<int:contrib_id>/approve/<str:csv_type>/', views.approve_contribution),
]