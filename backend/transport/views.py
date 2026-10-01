from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum, Count
from django.db.models.functions import TruncDate, TruncMonth

from .models import User, Vehicle, Driver, Route, Trip, Booking, Payment, Notification
from .serializers import (
    UserSerializer,
    VehicleSerializer,
    DriverSerializer,
    RouteSerializer,
    TripSerializer,
    BookingSerializer,
    PaymentSerializer,
    NotificationSerializer,
)


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['token'] = data.get('access')
        data['user'] = UserSerializer(self.user).data
        return data


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailTokenObtainPairSerializer


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'token': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by('id')
    serializer_class = VehicleSerializer


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all().order_by('id')
    serializer_class = DriverSerializer


class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all().order_by('id')
    serializer_class = RouteSerializer


class TripViewSet(viewsets.ModelViewSet):
    queryset = Trip.objects.all().order_by('id')
    serializer_class = TripSerializer

    @action(detail=True, methods=['put'])
    def location(self, request, pk=None):
        trip = self.get_object()
        trip.current_lat = request.data.get('current_lat')
        trip.current_lng = request.data.get('current_lng')
        trip.save()
        return Response(self.get_serializer(trip).data)


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all().order_by('id')
    serializer_class = BookingSerializer

    def perform_create(self, serializer):
        trip = serializer.validated_data['trip']
        seats = serializer.validated_data.get('seats', 1)
        if trip.capacity:
            booked = Booking.objects.filter(trip=trip).aggregate(total=Sum('seats'))['total'] or 0
            if booked + seats > trip.capacity:
                raise ValidationError('Not enough seats available for this trip.')
        serializer.save()


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('id')
    serializer_class = PaymentSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all().order_by('-created_at')
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

    @action(detail=True, methods=['put'])
    def read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(self.get_serializer(notification).data)


class ReportsSummary(APIView):
    def get(self, request):
        data = {
            'vehicles': Vehicle.objects.count(),
            'drivers': Driver.objects.count(),
            'routes': Route.objects.count(),
            'trips': Trip.objects.count(),
            'bookings': Booking.objects.count(),
            'revenue': float(Payment.objects.aggregate(total=Sum('amount'))['total'] or 0),
        }
        return Response(data)


class DailyTransportReport(APIView):
    def get(self, request):
        data = (
            Trip.objects.annotate(day=TruncDate('start_time'))
            .values('day')
            .annotate(trips=Count('id'))
            .order_by('day')
        )
        return Response(list(data))


class MonthlyRevenueReport(APIView):
    def get(self, request):
        data = (
            Payment.objects.annotate(month=TruncMonth('paid_at'))
            .values('month')
            .annotate(revenue=Sum('amount'))
            .order_by('month')
        )
        return Response(list(data))


class VehicleUsageReport(APIView):
    def get(self, request):
        data = (
            Trip.objects.values('vehicle__plate_number')
            .annotate(trips=Count('id'))
            .order_by('-trips')
        )
        return Response(list(data))


class DriverPerformanceReport(APIView):
    def get(self, request):
        data = (
            Trip.objects.values('driver__user__name')
            .annotate(trips=Count('id'))
            .order_by('-trips')
        )
        return Response(list(data))
