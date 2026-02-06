import boto3
from dotenv import load_dotenv

import os

load_dotenv()


s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY"),
    region_name=os.getenv("AWS_REGION"),
)

BUCKET= os.getenv("AWS_BUCKET_NAME")