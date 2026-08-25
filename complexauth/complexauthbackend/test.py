from app.email import send_email

send_email(
    "test@example.com",
    "Hello from SMTP test",
    "If you see this in your terminal, SMTP is working!"
)

print("Email sent")