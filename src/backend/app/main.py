import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SECRET_KEY = os.environ["SUPABASE_SECRET_KEY"]
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "https://localhost:5173")

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
)

app = FastAPI(title="Form Submission API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

BUCKET_NAME = "form-images"

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

# using this for deploy checks and boot up server
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/submissions")
async def create_submission(
    input_one: str = Form(...),
    input_two: str = Form(...),
    input_three: str = Form(...),
    image: UploadFile = File(...),
):
    # Basic string validation
    input_one = input_one.strip()
    input_two = input_two.strip()
    input_three = input_three.strip()

    if not input_one or not input_two or not input_three:
        raise HTTPException(
            status_code=400,
            detail="All three text fields are required.",
        )

    # Validate image type
    content_type = image.content_type or ""

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, and PDF files are accepted.",
        )

    # Read the uploaded image into memory
    image_bytes = await image.read()

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be smaller than 5 MB.",
        )

    # make our own filename for each submit
    extension = ALLOWED_IMAGE_TYPES[content_type]
    object_path = f"{uuid.uuid4()}{extension}"

    try:
        # Upload image to bucket (we only save image file path to table)
        upload_result = supabase.storage.from_(BUCKET_NAME).upload(
            object_path,
            image_bytes,
            file_options={
                "content-type": content_type,
                "cache-control": "3600",
                "upsert": "false",
            },
        )

        # check if upload worked
        if not upload_result:
            raise RuntimeError("Image upload failed.")

        # Store the text values and image path in Postgres
        insert_result = (
            supabase.table("form_submissions")
            .insert(
                {
                    "input_one": input_one,
                    "input_two": input_two,
                    "input_three": input_three,
                    "image_path": object_path,
                }
            )
            .execute()
        )

        if not insert_result.data:
            raise RuntimeError("Database insert failed.")

        return {
            "success": True,
            "submission_id": insert_result.data[0]["id"],
        }

    except Exception as error:
        # remove image from database if submission fails (rare edge case)
        try:
            supabase.storage.from_(BUCKET_NAME).remove([object_path])
        except Exception:
            pass

        print(f"Submission error: {error}")
        raise HTTPException(
            status_code=500,
            detail="Could not save the submission.",
        )