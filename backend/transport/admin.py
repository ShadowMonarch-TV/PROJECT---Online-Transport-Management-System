from django.contrib import admin
from .models import User, Vehicle, Driver, Route, Trip, Booking, Payment, Notification

admin.site.register(User)
admin.site.register(Vehicle)
admin.site.register(Driver)
admin.site.register(Route)
admin.site.register(Trip)
admin.site.register(Booking)
admin.site.register(Payment)
admin.site.register(Notification)
