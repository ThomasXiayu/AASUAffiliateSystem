import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from supabase import Client, create_client

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SECRET_KEY = os.environ["SUPABASE_SECRET_KEY"]
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "https://localhost:5173")

EVENT_CODE_TTL_HOURS = float(os.getenv("EVENT_CODE_TTL_HOURS", "24"))

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

def event_code_expiration_cutoff() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=EVENT_CODE_TTL_HOURS)).isoformat()

# using this for deploy checks and boot up server
@app.get("/health")
def health_check():
    return {"status": "ok"}


def refresh_leaderboard(affiliate: str) -> None:
    leaderboard_result = supabase.table("leaderboard").select("*").execute()
    matching_row = next(
        (
            row for row in (leaderboard_result.data or [])
            if str(row.get("affiliate", "")).casefold() == affiliate.casefold()
        ),
        None,
    )

    if matching_row:
        supabase.table("leaderboard").update(
            {"points": int(matching_row.get("points") or 0) + 1}
        ).eq("affiliate", matching_row["affiliate"]).execute()
    else:
        raise RuntimeError(f"Affiliate '{affiliate}' is missing from leaderboard.")

    all_rows = supabase.table("leaderboard").select("*").execute().data or []
    all_rows.sort(key=lambda row: (-int(row.get("points") or 0), row["affiliate"]))

    for position, row in enumerate(all_rows, start=1):
        supabase.table("leaderboard").update(
            {"rank": position}
        ).eq("affiliate", row["affiliate"]).execute()


@app.get("/api/leaderboard")
def get_leaderboard():
    try:
        result = supabase.table("leaderboard").select("*").execute()
        rows = result.data or []
        rows.sort(key=lambda row: (-int(row.get("points") or 0), row["affiliate"]))

        return {
            "leaderboard": [
                {
                    "affiliate": row["affiliate"],
                    "rank": position,
                    "points": int(row.get("points") or 0),
                }
                for position, row in enumerate(rows, start=1)
            ]
        }
    except Exception as error:
        print(f"Leaderboard error: {error}")
        raise HTTPException(
            status_code=500,
            detail="Could not load leaderboard.",
        )


@app.post("/api/codesetup")
async def codesetup(
    input_one: str = Form(...),
    input_two: str = Form(...),
    input_three: str = Form(...),
):
    # Basic string validation
    input_one = input_one.strip()
    input_two = input_two.strip()
    input_three = input_three.strip()

    if not input_one or not input_two or not input_three:
        raise HTTPException(
            status_code=400,
            detail="All three fields are required.",
        )

    try:
        # validate presidents key
        key_result = (
            supabase.table("affiliate_secrets")
            .select("master_key, affiliate")
            .eq("master_key", input_two)
            .limit(1)
            .execute()
        )

        if not key_result.data:
            raise HTTPException(
                status_code=403,
                detail="The president key is not valid.",
            )

        affiliate = key_result.data[0].get("affiliate")

        if not affiliate:
            raise HTTPException(
                status_code=500,
                detail="The president key has no affiliate assigned.",
            )

        # Remove the affiliate's previous code before creating its replacement.
        supabase.table("code_creations").delete().eq("affiliate", affiliate).execute()

        # Store the new code. Supabase's created_at default starts its TTL.
        insert_result = (
            supabase.table("code_creations")
            .insert(
                {
                    "name": input_one,
                    "affiliate": affiliate,
                    "event_code": input_three,
                }
            )
            .execute()
        )

        if not insert_result.data:
            raise RuntimeError("Database insert failed.")

        return {
            "success": True,
            "affiliate": affiliate,
            }
    
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process submission: {str(error)}",
        )

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

        # Remove expired codes before looking up the submitted code.
        supabase.table("code_creations").delete().lt(
            "created_at", event_code_expiration_cutoff()
        ).execute()

        # Validate the event code.
        key_result = (
            supabase.table("code_creations")
            .select("event_code, affiliate")
            .eq("event_code", input_three)
            .limit(1)
            .execute()
        )

        if not key_result.data:
            raise HTTPException(
                status_code=403,
                detail="The event code is not valid.",
            )

        # Store the text values and image path in Postgres
        insert_result = (
            supabase.table("form_submissions")
            .insert(
                {
                    "Name": input_one,
                    "Affiliate": input_two,
                    "Event_Code": input_three,
                    "image_path": object_path,
                }
            )
            .execute()
        )

        if not insert_result.data:
            raise RuntimeError("Database insert failed.")

        # The dropdown affiliate earns the point, regardless of who created the code.
        try:
            refresh_leaderboard(input_two)
        except Exception as leaderboard_error:
            print(f"Leaderboard update error: {leaderboard_error}")

        return {
            "success": True,
            "affiliate": input_two,
        }

    # delete the bucket path if the code is expired
    except HTTPException:
        try:
            supabase.storage.from_(BUCKET_NAME).remove([object_path])
        except Exception:
            pass
        raise

    except Exception as error:
        # remove image from database if submission fails (rare edge case)
        try:
            supabase.storage.from_(BUCKET_NAME).remove([object_path])
        except Exception:
            pass

        print(f"Submission error: {error}")
        raise HTTPException(
            status_code=500,
            detail="Could not submit. Check event code",
        )