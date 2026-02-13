from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserOut(BaseModel):
    id: str
    email: EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
