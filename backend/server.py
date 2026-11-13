from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import asyncio
import os
import logging
import uuid
from contextlib import suppress
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, Query, HTTPException, Request, Depends, UploadFile, File, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel
from pydantic import BaseModel, Field, ConfigDict

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

INDEXES: dict[str, list[IndexModel]] = {
    "listings": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("category", ASCENDING), ("type", ASCENDING)], name="cat_type"),
        IndexModel([("featured", ASCENDING)], name="featured"),
        IndexModel([("zone", ASCENDING)], name="zone"),
    ],
    "users": [IndexModel([("email", ASCENDING)], name="email", unique=True)],
    "login_attempts": [IndexModel([("identifier", ASCENDING)], name="identifier")],
    "files": [IndexModel([("storage_path", ASCENDING)], name="storage_path")],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)

# ---------- Storage ----------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "tuacarigua"
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ["EMERGENT_LLM_KEY"]}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": init_storage(), "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": init_storage(True), "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage()}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ---------- Auth ----------
JWT_ALGORITHM = "HS256"


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def get_admin(request: Request) -> dict:
    token = request.cookies.get("access_token")
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(401, "No autenticado")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(401, "No autorizado")
    return user

# ---------- Models ----------
Category = Literal["inmuebles", "vehiculos", "otros"]
Currency = Literal["USD", "Bs"]


class ListingIn(BaseModel):
    title: str = Field(min_length=3)
    category: Category
    type: str
    price: float = Field(ge=0)
    currency: Currency = "USD"
    zone: str
    description: str = ""
    images: List[str] = []
    featured: bool = False
    sold: bool = False
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area_m2: Optional[float] = None
    year: Optional[int] = None
    km: Optional[int] = None
    brand: Optional[str] = None


class Listing(ListingIn):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ListingPatch(BaseModel):
    featured: Optional[bool] = None
    sold: Optional[bool] = None


class LoginIn(BaseModel):
    email: str
    password: str

# ---------- App ----------
app = FastAPI()
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "TUACARIGUA.COM API"}


@api.get("/config")
async def config():
    return {"whatsapp_number": os.environ["WHATSAPP_NUMBER"]}


@api.get("/listings", response_model=List[Listing])
async def list_listings(
    category: Optional[Category] = None, type: Optional[str] = None, zone: Optional[str] = None,
    currency: Optional[Currency] = None, min_price: Optional[float] = None, max_price: Optional[float] = None,
    q: Optional[str] = None, featured: Optional[bool] = None, hide_sold: bool = False,
    sort: Literal["recent", "price_asc", "price_desc"] = "recent", limit: int = Query(60, ge=1, le=200),
):
    f: dict = {}
    if category: f["category"] = category
    if type: f["type"] = type
    if zone: f["zone"] = zone
    if currency: f["currency"] = currency
    if featured is not None: f["featured"] = featured
    if hide_sold: f["sold"] = False
    if min_price is not None or max_price is not None:
        f["price"] = {}
        if min_price is not None: f["price"]["$gte"] = min_price
        if max_price is not None: f["price"]["$lte"] = max_price
    if q:
        f["$or"] = [{"title": {"$regex": q, "$options": "i"}}, {"description": {"$regex": q, "$options": "i"}},
                    {"zone": {"$regex": q, "$options": "i"}}]
    sort_spec = {"recent": [("sold", 1), ("created_at", -1)], "price_asc": [("price", 1)], "price_desc": [("price", -1)]}[sort]
    docs = await db.listings.find(f, {"_id": 0}).sort(sort_spec).limit(limit).to_list(limit)
    return [Listing(**d) for d in docs]


@api.get("/listings/{listing_id}", response_model=Listing)
async def get_listing(listing_id: str):
    d = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Anuncio no encontrado")
    return Listing(**d)


@api.get("/zones", response_model=List[str])
async def zones():
    return sorted(z for z in await db.listings.distinct("zone") if z)


@api.get("/files/{path:path}")
async def serve_file(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Archivo no encontrado")
    data, ct = await asyncio.to_thread(get_object, path)
    return Response(content=data, media_type=rec.get("content_type") or ct,
                    headers={"Cache-Control": "public, max-age=86400"})

# ---------- Auth routes ----------
@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.strip().lower()
    ident = f"{request.client.host if request.client else 'x'}:{email}"
    att = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    if att and att.get("count", 0) >= 5 and att.get("locked_until") and datetime.fromisoformat(att["locked_until"]) > now:
        raise HTTPException(429, "Demasiados intentos. Intenta en 15 minutos.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (att.get("count", 0) if att else 0) + 1
        upd = {"count": count}
        if count >= 5:
            upd["locked_until"] = (now + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": ident}, {"$set": upd}, upsert=True)
        raise HTTPException(401, "Correo o contraseña incorrectos")
    await db.login_attempts.delete_many({"identifier": ident})
    token = create_access_token(user["id"], email)
    return {"token": token, "user": {"id": user["id"], "email": email, "name": user.get("name"), "role": user["role"]}}


@api.get("/auth/me")
async def me(admin: dict = Depends(get_admin)):
    return admin

# ---------- Admin routes ----------
@api.get("/admin/stats")
async def stats(_: dict = Depends(get_admin)):
    total = await db.listings.count_documents({})
    return {
        "total": total,
        "sold": await db.listings.count_documents({"sold": True}),
        "featured": await db.listings.count_documents({"featured": True}),
        "inmuebles": await db.listings.count_documents({"category": "inmuebles"}),
        "vehiculos": await db.listings.count_documents({"category": "vehiculos"}),
        "otros": await db.listings.count_documents({"category": "otros"}),
    }


@api.post("/admin/listings", response_model=Listing)
async def create_listing(body: ListingIn, _: dict = Depends(get_admin)):
    listing = Listing(**body.model_dump())
    await db.listings.insert_one(listing.model_dump())
    return listing


@api.put("/admin/listings/{listing_id}", response_model=Listing)
async def update_listing(listing_id: str, body: ListingIn, _: dict = Depends(get_admin)):
    res = await db.listings.update_one({"id": listing_id}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Anuncio no encontrado")
    return Listing(**await db.listings.find_one({"id": listing_id}, {"_id": 0}))


@api.patch("/admin/listings/{listing_id}", response_model=Listing)
async def patch_listing(listing_id: str, body: ListingPatch, _: dict = Depends(get_admin)):
    upd = body.model_dump(exclude_none=True)
    if upd:
        await db.listings.update_one({"id": listing_id}, {"$set": upd})
    d = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Anuncio no encontrado")
    return Listing(**d)


@api.delete("/admin/listings/{listing_id}")
async def delete_listing(listing_id: str, _: dict = Depends(get_admin)):
    res = await db.listings.delete_one({"id": listing_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Anuncio no encontrado")
    return {"ok": True}


ALLOWED_IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}


@api.post("/admin/upload")
async def upload(file: UploadFile = File(...), _: dict = Depends(get_admin)):
    ct = file.content_type or ""
    if ct not in ALLOWED_IMG:
        raise HTTPException(400, "Formato no permitido. Usa JPG, PNG, WEBP o GIF.")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "La imagen supera 10 MB")
    path = f"{APP_NAME}/listings/{uuid.uuid4()}.{ALLOWED_IMG[ct]}"
    result = await asyncio.to_thread(put_object, path, data, ct)
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": result["path"], "original_filename": file.filename,
                               "content_type": ct, "size": result.get("size"), "is_deleted": False,
                               "created_at": datetime.now(timezone.utc).isoformat()})
    return {"url": f"/api/files/{result['path']}"}


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])

# ---------- Seed ----------
U = "?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1400"
IMG = {
    "casa1": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914" + U,
    "casa2": "https://images.unsplash.com/photo-1706808849780-7a04fbac83ef" + U,
    "apto": "https://images.unsplash.com/photo-1721815693498-cc28507c0ba2" + U,
    "apto_in": "https://images.unsplash.com/photo-1628592102751-ba83b0314276" + U,
    "apto_in2": "https://images.unsplash.com/photo-1613575831056-0acd5da8f085" + U,
    "terreno": "https://images.unsplash.com/photo-1667344238075-c3742c5f86a1" + U,
    "terreno2": "https://images.unsplash.com/photo-1580738204555-8686f3a2db43" + U,
    "suv": "https://images.unsplash.com/photo-1777015287086-fb9ceffbdaed" + U,
    "jeep": "https://images.unsplash.com/photo-1618353482480-61ca5a9a7879" + U,
    "moto1": "https://images.unsplash.com/photo-1609630875171-b1321377ee65" + U,
    "moto2": "https://images.unsplash.com/photo-1588627541420-fce3f661b779" + U,
    "nevera": "https://images.unsplash.com/photo-1643356472833-5b1f2cd4ca3c" + U,
}
SEED = [
    dict(title="Quinta con piscina en Urb. La Goajira", category="inmuebles", type="casa", price=120000, currency="USD", zone="Acarigua Norte",
         description="(Ejemplo) Amplia quinta de 2 plantas con piscina, 4 habitaciones, 3 baños, cocina empotrada y estacionamiento para 3 vehículos. Documentos en regla.",
         images=[IMG["casa1"], IMG["casa2"], IMG["apto_in"]], featured=True, bedrooms=4, bathrooms=3, area_m2=380),
    dict(title="Casa moderna en Araure, sector Llano Alto", category="inmuebles", type="casa", price=68000, currency="USD", zone="Araure",
         description="(Ejemplo) Casa de una planta, 3 habitaciones, 2 baños, patio trasero y tanque de agua.",
         images=[IMG["casa2"], IMG["apto_in2"]], featured=True, bedrooms=3, bathrooms=2, area_m2=210),
    dict(title="Apartamento amoblado en Residencias El Pilar", category="inmuebles", type="apartamento", price=35000, currency="USD", zone="Centro",
         description="(Ejemplo) Apartamento de 2 habitaciones, 2 baños, piso 4 con ascensor y vigilancia 24h.",
         images=[IMG["apto"], IMG["apto_in"], IMG["apto_in2"]], featured=True, bedrooms=2, bathrooms=2, area_m2=85),
    dict(title="Terreno de 1.200 m² vía Payara", category="inmuebles", type="terreno", price=18000, currency="USD", zone="Payara",
         description="(Ejemplo) Terreno plano con servicios cercanos, ideal para construcción o galpón.",
         images=[IMG["terreno"], IMG["terreno2"]], area_m2=1200),
    dict(title="Toyota 4Runner 2019 impecable", category="vehiculos", type="carro", price=38500, currency="USD", zone="Acarigua Norte",
         description="(Ejemplo) Camioneta automática, 4x4, único dueño, servicios al día.",
         images=[IMG["suv"], IMG["jeep"]], featured=True, year=2019, km=62000, brand="Toyota"),
    dict(title="Jeep Wrangler 2016", category="vehiculos", type="carro", price=27000, currency="USD", zone="Araure",
         description="(Ejemplo) Jeep 4x4 sincrónico, rines nuevos, cauchos al 80%.",
         images=[IMG["jeep"]], sold=True, year=2016, km=98000, brand="Jeep"),
    dict(title="Moto deportiva 600cc", category="vehiculos", type="moto", price=6500, currency="USD", zone="Centro",
         description="(Ejemplo) Moto deportiva en excelente estado, papeles al día.",
         images=[IMG["moto1"]], featured=True, year=2020, km=15000, brand="Kawasaki"),
    dict(title="Yamaha R1 azul", category="vehiculos", type="moto", price=9800, currency="USD", zone="Acarigua Norte",
         description="(Ejemplo) Yamaha R1 con escape deportivo y mantenimiento reciente.",
         images=[IMG["moto2"]], year=2018, km=21000, brand="Yamaha"),
    dict(title="Nevera de acero inoxidable 18 pies", category="otros", type="electrodomestico", price=14500, currency="Bs", zone="Centro",
         description="(Ejemplo) Nevera no frost con dispensador de agua, funcionando perfectamente.",
         images=[IMG["nevera"]]),
]


async def seed():
    email = os.environ["ADMIN_EMAIL"].lower()
    if not await db.users.find_one({"email": email}):
        await db.users.insert_one({"id": str(uuid.uuid4()), "email": email, "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]),
                                   "name": "Administrador", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
    if await db.listings.count_documents({}) == 0:
        base = datetime.now(timezone.utc)
        for i, s in enumerate(SEED):
            item = Listing(**s, created_at=(base - timedelta(hours=i)).isoformat())
            await db.listings.insert_one(item.model_dump())


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    await seed()
    try:
        await asyncio.to_thread(init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
