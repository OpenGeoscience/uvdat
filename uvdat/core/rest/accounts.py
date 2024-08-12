from allauth.account.forms import SignupForm
from django import forms


class AccountSignupForm(SignupForm):
    first_name = forms.CharField(
        label=('First Name'),
        min_length=1,
        widget=forms.TextInput(attrs={'placeholder': ('First name')}),
    )
    last_name = forms.CharField(
        label=('Last Name'),
        min_length=1,
        widget=forms.TextInput(attrs={'placeholder': ('Last name')}),
    )
