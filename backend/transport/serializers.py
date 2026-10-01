from rest_framework import serializers
from .models import User, Vehicle, Driver, Route, Trip, Booking, Payment, Notification


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        return User.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['id', 'plate_number', 'model', 'capacity', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']


class DriverSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='user')
    user_name = serializers.CharField(source='user.name', read_only=True)
    assigned_vehicle_id = serializers.PrimaryKeyRelatedField(queryset=Vehicle.objects.all(), source='assigned_vehicle', allow_null=True, required=False)
    assigned_vehicle_plate = serializers.CharField(source='assigned_vehicle.plate_number', read_only=True)

    class Meta:
        model = Driver
        fields = [
            'id',
            'user_id',
            'user_name',
            'license_number',
            'phone',
            'assigned_vehicle_id',
            'assigned_vehicle_plate',
        ]


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = ['id', 'name', 'origin', 'destination', 'distance_km', 'duration_min']


class TripSerializer(serializers.ModelSerializer):
    route_id = serializers.PrimaryKeyRelatedField(queryset=Route.objects.all(), source='route')
    route_name = serializers.CharField(source='route.name', read_only=True)
    vehicle_id = serializers.PrimaryKeyRelatedField(queryset=Vehicle.objects.all(), source='vehicle', allow_null=True, required=False)
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    driver_id = serializers.PrimaryKeyRelatedField(queryset=Driver.objects.all(), source='driver', allow_null=True, required=False)
    driver_name = serializers.CharField(source='driver.user.name', read_only=True)

    class Meta:
        model = Trip
        fields = [
            'id',
            'route_id',
            'route_name',
            'vehicle_id',
            'vehicle_plate',
            'driver_id',
            'driver_name',
            'start_time',
            'end_time',
            'status',
            'capacity',
            'current_lat',
            'current_lng',
        ]


class BookingSerializer(serializers.ModelSerializer):
    trip_id = serializers.PrimaryKeyRelatedField(queryset=Trip.objects.all(), source='trip')
    passenger_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='passenger')
    route_name = serializers.CharField(source='trip.route.name', read_only=True)
    passenger_name = serializers.CharField(source='passenger.name', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'trip_id',
            'passenger_id',
            'route_name',
            'passenger_name',
            'seats',
            'status',
            'booked_at',
        ]
        read_only_fields = ['booked_at']


class PaymentSerializer(serializers.ModelSerializer):
    booking_id = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all(), source='booking')
    passenger_name = serializers.CharField(source='booking.passenger.name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'booking_id',
            'passenger_name',
            'amount',
            'method',
            'status',
            'transaction_id',
            'paid_at',
        ]
        read_only_fields = ['paid_at']


class NotificationSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source='user')
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'user_id', 'user_name', 'title', 'message', 'is_read', 'created_at']
        read_only_fields = ['created_at']
