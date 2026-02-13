from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Status(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    priority: Priority = Priority.medium
    due_date: datetime | None = None
    status: Status = Status.todo

class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    priority: Priority | None = None
    due_date: datetime | None = None
    status: Status | None = None


class TaskOut(TaskCreate):
    id: str
    created_at: datetime
    updated_at: datetime
