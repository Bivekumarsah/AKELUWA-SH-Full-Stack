from django.urls import path
from . import views

urlpatterns = [
    path("", views.home),
    path("reducer/", views.standalone),
    path("api/pdf-reducer/capabilities/", views.capabilities),
    path("api/pdf-reducer/compress/", views.compress),
    path("api/compress/", views.compress),
    path("<path:name>", views.asset),
]
