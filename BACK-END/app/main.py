from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.upload import router as upload_router

# Create FastAPI app
app = FastAPI(
    title="AI Code Review Assistant",
    version="1.0.0",
    description="AI Powered Secure Code Analysis Platform"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routes
app.include_router(upload_router)

# Root Route
@app.get("/")
async def root():
    return {
        "status": "Backend Running",
        "project": "AI Code Review Assistant",
        "version": "1.0.0"
    }