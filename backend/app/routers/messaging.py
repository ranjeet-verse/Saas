from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
import json

from ..database import get_db
from ..models import models
from ..core import oauth2
from ..schema import schemas

router = APIRouter(
    prefix="/messages",
    tags=["Messages"]
)


class ConnectionManager:
    def __init__(self):
        self.active_connectiion: dict[int, WebSocket] = {}

    async def connect(self , websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connectiions[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connectiions:
            del self.active_connectiions[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connectiions:
            await self.active_connectiions[user_id].send_json(message)

    async def broadcast(self, message: dict, exclude_user_id: Optional[int]= None):
        for user_id, connection in self.active_connectiions.items():
            if user_id != exclude_user_id:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            if message_data.get("type") == "typing":
                await manager.broadcast({
                    "type": "typing",
                    "user_id": user_id,
                    "conversation_id": message_data.get("conversation_id")
                }, exclude_user_id=user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)


@router.post("/conversations", response_model=schemas.ConversationOut)
async def create_conversation(
    data: schemas.CreateConversation,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),):

    existing = db.query(models.Conversation).join(models.ConversationParticipant).filter(
        models.ConversationParticipant.user_id.in_([current_user.id, data.user_id]),
        models.Conversation.is_group.is_(False)
    ).group_by(models.Conversation.id).having(
        func.count(models.ConversationParticipnt.user_id) == 2
    ).first()

    if existing:
        return existing

    conversation = models.Conversation()
    db.add(conversation)
    db.flush()

    participants = [
        models.ConversationParticipnt(conversation_id=conversation.id, user_id=current_user.id),
        models.ConversationParticipnt(conversation_id=conversation.id, user_id=data.user_id)
    ]
    db.add_all(participants)
    db.commit()
    db.refresh(conversation)

    return conversation

@router.get("/conversations", response_model=List[schemas.ConversationOut])
async def get_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    conversations = db.query(models.Conversation).join(models.ConversationParticipant).filter(
        models.ConversationParticipant.user_id == current_user.id).order_by(models.Conversation.updated_at.desc()).all()   
    return conversations

@router.get("/conversations/{conversation_id}/messages", response_model=List[schemas.MessageOut])
async def get_messages(
    conversation_id: int,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user : models.User = Depends(oauth2.get_current_user),
):
    
    participant = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.conversation_id == conversation_id,
        models.ConversationParticipant.user_id == current_user.id
    ).first()

    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")
    
    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(models.Message.created_at.desc()).offset(offset).limit(limit).all()

    db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id,
        models.Message.sender_id != current_user.id,
        models.Message.is_read.is_(False)
    ).update({"is_read": True})
    db.commit()

    return messages[::-1]

@router.post("/conversations/{conversation_id}/messages", response_model=schemas.MessageOut)
async def send_message(
    conversation_id: int,
    data: schemas.CreateMessage,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user),
):
    
    participant = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.conversation_id == conversation_id,
        models.ConversationParticipant.user_id == current_user.id
    ).first()

    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant")

    message = models.Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=data.content
    )
    db.add(message)

    db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).update({"updated_at": datetime.now(timezone.utc)})

    db.commit()
    db.refresh(message)

    participants = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.conversation_id  == conversation_id,
        models.ConversationParticipant.user_id != current_user.id
    ).all()

    message_data = {
        "type": "message",
        "message":{
            "id": message.id,
            "content": message.content,
            "sender_id": message.sender_id,
            "created_at": message.created_at.isoformat(),
            "conversation_id": conversation_id
        }
    }

    for participant in participants:
        await manager.send_personal_message(message_data, participant.user_id)

    return message

@router.get("/unread_count")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(oauth2.get_current_user)
):
    count = db.query(models.Message).join(
        models.ConversationParticipant,
        models.Message.conversation_id == models.ConversationParticipant.conversation_id).filter(
            models.ConversationParticipant.user_id == current_user.id,
            models.Message.sender_id != current_user.id,
            models.Message.is_read.is_(False)
        ).count()
    
    
    return {"unread_count": count}