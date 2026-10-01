from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    RegisterView,
    MeView,
    UserViewSet,
    VehicleViewSet,
    DriverViewSet,
    RouteViewSet,
    TripViewSet,
    BookingViewSet,
    PaymentViewSet,
    NotificationViewSet,
    ReportsSummary,
    DailyTransportReport,
    MonthlyRevenueReport,
    VehicleUsageReport,
    DriverPerformanceReport,
)

router = DefaultRouter()
router.register('users', UserViewSet, basename='users')
router.register('vehicles', VehicleViewSet, basename='vehicles')
router.register('drivers', DriverViewSet, basename='drivers')
router.register('routes', RouteViewSet, basename='routes')
router.register('trips', TripViewSet, basename='trips')
router.register('bookings', BookingViewSet, basename='bookings')
router.register('payments', PaymentViewSet, basename='payments')
router.register('notifications', NotificationViewSet, basename='notifications')

urlpatterns = [
    path('auth/register', RegisterView.as_view()),
    path('auth/login', LoginView.as_view()),
    path('auth/me', MeView.as_view()),
    path('reports/summary', ReportsSummary.as_view()),
    path('reports/daily-transport', DailyTransportReport.as_view()),
    path('reports/monthly-revenue', MonthlyRevenueReport.as_view()),
    path('reports/vehicle-usage', VehicleUsageReport.as_view()),
    path('reports/driver-performance', DriverPerformanceReport.as_view()),
    path('', include(router.urls)),
]
