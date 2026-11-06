from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),                 # Django's built-in admin
    path('api/auth/', include('userauth.urls')),
    path('api/admin/', include('adminpanel.urls')),
    path('api/', include('detection.urls')),
]