from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from fastapi import Depends

from app.db.mongo import get_db
from app.models.task import TaskCreate, TaskOut, TaskUpdate, Status
from app.core.deps import get_current_user_id

router = APIRouter(tags=["tasks"])

# TEMP until Step 8 (real auth)
# str = Depends(get_current_user_id) = "demo-user"


def _to_out(doc) -> TaskOut:
    return TaskOut(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description"),
        priority=doc["priority"],
        due_date=doc.get("due_date"),
        status=doc["status"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("/tasks", response_model=TaskOut, status_code=201)
async def create_task(payload: TaskCreate, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    now = datetime.utcnow()

    doc = payload.model_dump()
    doc.update({"user_id": user_id, "created_at": now, "updated_at": now})

    result = await db.tasks.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_out(doc)


@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(
    status: Status | None = Query(default=None),
    due: str | None = Query(default=None, description="Use 'this_week'"),
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()
    q: dict = {"user_id": user_id}

    if status is not None:
        q["status"] = status.value

    if due == "this_week":
        start = datetime.utcnow()
        end = start + timedelta(days=7)
        q["due_date"] = {"$gte": start, "$lte": end}

    cursor = db.tasks.find(q).sort("created_at", -1)
    docs = await cursor.to_list(length=200)
    return [_to_out(d) for d in docs]


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task id")

    res = await db.tasks.delete_one({"_id": oid, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return None

@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task id")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.utcnow()

    res = await db.tasks.find_one_and_update(
        {"_id": oid, "user_id": user_id},
        {"$set": updates},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Task not found")

    return _to_out(res)

