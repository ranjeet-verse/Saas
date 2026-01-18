import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = ""
SMTP_PASSWORD = ""

def send_invitation_email(to_email, invite_link, invited_by, company_name):
    """Send invitation email"""
    
    # Email setup
    sender = SMTP_USER
    password = SMTP_PASSWORD
    
    # Create email
    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = to_email
    msg["Subject"] = f"Invitation to join {company_name}"

    # Email body - simple HTML
    body = f"""
    <html>
    <body style="font-family: Arial; padding: 20px;">
        <h2>You're Invited! 🎉</h2>
        <p>Hi there,</p>
        <p><b>{invited_by}</b> invited you to join <b>{company_name}</b>.</p>
        <p>
            <a href="{invite_link}" 
               style="background-color: #4F46E5; 
                      color: white; 
                      padding: 10px 20px; 
                      text-decoration: none; 
                      border-radius: 5px;">
                Accept Invitation
            </a>
        </p>
        <p>This link expires in 7 days.</p>
    </body>
    </html>
    """

    msg.attach(MIMEText(body, "html"))

    # Send email
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender, password)
        server.send_message(msg)
        server.quit()
        print(f"✅ Email sent to {to_email}")
    except Exception as e:
        print(f"❌ Error: {e}")