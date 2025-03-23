import uuid
from base64 import b64encode

from fastapi import APIRouter, File, Depends, HTTPException, UploadFile, Form
import torch
from TTS.api import TTS
from TTS.tts.configs.xtts_config import XttsArgs
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse
from typing import Optional

from controllers.request_models.voice_models import VoiceRequest, VoiceGenerateRequest
import os
import time
from middleware.withAdmin import verify_admin
from models.user import Voices
from utils.database import get_db

router = APIRouter(prefix="/voice", tags=["Clone Voice"])

@router.post("/clone")
async def clone_voice(
    audio_file: UploadFile = File(...),
    share_for_training: Optional[bool] = Form(False),
    admin_payload: dict = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    try:
        if not audio_file.content_type.startswith('audio/'):
            raise HTTPException(
                status_code=400, 
                detail="Invalid file type. Please upload an audio file."
            )
            
        content = await audio_file.read()
        user_voice_data = Voices(
            voice_id=str(uuid.uuid4()),
            voice_bytes=content,
            share_for_training=share_for_training,
            user_id=admin_payload['user_id']
        )
        db.add(user_voice_data)
        db.commit()
        db.refresh(user_voice_data)

        return {"message": "Voice cloned successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my")
async def get_my_voices(
    admin_payload: dict = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    try:
        user_voices = db.query(Voices).filter(Voices.user_id == admin_payload['user_id']).all()
        
        # Prepare the response data, excluding binary data or encoding it
        response_data = [
            {
                "voice_id": voice.voice_id,
                "share_for_training": voice.share_for_training,
                "user_id": voice.user_id,
                # Ensure that voice_bytes is accessed correctly and encoded
                "voice_bytes": b64encode(voice.voice_bytes).decode('utf-8') if voice.voice_bytes else None
            }
            for voice in user_voices
        ]
        
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/synthesize")
async def generate_voice(
    voice_request: VoiceGenerateRequest,
    admin_payload: dict = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    try:
        # Get the user's voice from the database
        user_voice = db.query(Voices).filter(
            Voices.user_id == admin_payload['user_id'],
            Voices.voice_id == voice_request.voice_id
        ).first()
        
        if not user_voice:
            raise HTTPException(status_code=404, detail="Voice not found")

        # Save the voice bytes to a temporary file
        temp_voice_path = f"./temp_voice_{admin_payload['user_id']}.wav"
        with open(temp_voice_path, "wb") as f:
            f.write(user_voice.voice_bytes)

        device = "cuda" if torch.cuda.is_available() else "cpu"
        torch.serialization.add_safe_globals([XttsArgs])
        
        output_path = f"./user_response_{admin_payload['user_id']}_{time.time()}.wav"
        
        try:
            tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
            torch.serialization.add_safe_globals([XttsArgs])
            tts.tts_to_file(
                text=voice_request.text,
                speaker_wav=temp_voice_path,
                language="en",  # You might want to detect language or make it configurable
                file_path=output_path
            )

            # Clean up the temporary voice file
            if os.path.exists(temp_voice_path):
                os.remove(temp_voice_path)

            # Return the generated audio file
            if os.path.exists(output_path):
                def iterfile():
                    with open(output_path, "rb") as f:
                        yield from f
                    os.remove(output_path)  # Clean up after sending

                return StreamingResponse(
                    iterfile(),
                    media_type="audio/wav",
                    headers={"Content-Disposition": "attachment; filename=response.wav"}
                )
            else:
                raise HTTPException(status_code=500, detail="Failed to generate audio file")

        finally:
            # Ensure cleanup of temporary files
            for file in [temp_voice_path, output_path]:
                if os.path.exists(file):
                    os.remove(file)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))