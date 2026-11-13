# TUACARIGUA.COM marketplace API regression tests
import io
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@tuacarigua.com", "password": "Tuacarigua2026!"}

# 1x1 PNG
PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a0e2b3a90000000049454e44ae426082"
)


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def created_ids(auth):
    ids = []
    yield ids
    for i in ids:
        requests.delete(f"{BASE_URL}/api/admin/listings/{i}", headers=auth)


# --- Public endpoints
class TestPublic:
    def test_root_and_config(self):
        assert requests.get(f"{BASE_URL}/api/").status_code == 200
        r = requests.get(f"{BASE_URL}/api/config")
        assert r.status_code == 200
        assert r.json()["whatsapp_number"] == "584245245770"

    def test_listings_seed(self):
        r = requests.get(f"{BASE_URL}/api/listings", params={"limit": 200})
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 9
        assert all("_id" not in d for d in data)
        # recent sort puts sold last
        sold_flags = [d["sold"] for d in data]
        assert sold_flags == sorted(sold_flags)

    def test_featured_hide_sold(self):
        data = requests.get(f"{BASE_URL}/api/listings", params={"featured": "true", "hide_sold": "true"}).json()
        assert len(data) > 0
        assert all(d["featured"] and not d["sold"] for d in data)

    def test_filters_category_type_zone_currency(self):
        d = requests.get(f"{BASE_URL}/api/listings", params={"category": "vehiculos", "type": "moto"}).json()
        assert d and all(x["category"] == "vehiculos" and x["type"] == "moto" for x in d)
        d = requests.get(f"{BASE_URL}/api/listings", params={"zone": "Araure"}).json()
        assert d and all(x["zone"] == "Araure" for x in d)
        d = requests.get(f"{BASE_URL}/api/listings", params={"currency": "Bs"}).json()
        assert d and all(x["currency"] == "Bs" for x in d)

    def test_price_range_and_sort(self):
        d = requests.get(f"{BASE_URL}/api/listings", params={"min_price": 10000, "max_price": 40000, "sort": "price_asc"}).json()
        prices = [x["price"] for x in d if x["currency"] == "USD"]
        assert d and all(10000 <= x["price"] <= 40000 for x in d)
        assert prices == sorted(prices)
        d = requests.get(f"{BASE_URL}/api/listings", params={"sort": "price_desc"}).json()
        prices = [x["price"] for x in d if x["currency"] == "USD"]
        assert prices == sorted(prices, reverse=True)

    def test_text_search(self):
        d = requests.get(f"{BASE_URL}/api/listings", params={"q": "toyota"}).json()
        assert d and any("Toyota" in x["title"] for x in d)

    def test_text_search_regex_special_chars(self):
        r = requests.get(f"{BASE_URL}/api/listings", params={"q": "("})
        assert r.status_code == 200, f"regex special char -> {r.status_code}"

    def test_hide_sold(self):
        d = requests.get(f"{BASE_URL}/api/listings", params={"hide_sold": "true", "limit": 200}).json()
        assert all(not x["sold"] for x in d)

    def test_zones(self):
        z = requests.get(f"{BASE_URL}/api/zones").json()
        assert "Araure" in z and z == sorted(z)

    def test_listing_404(self):
        assert requests.get(f"{BASE_URL}/api/listings/nonexistent-id").status_code == 404

    def test_invalid_category_422(self):
        assert requests.get(f"{BASE_URL}/api/listings", params={"category": "foo"}).status_code == 422


# --- Auth
class TestAuth:
    def test_login_ok(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        assert r.status_code == 200
        j = r.json()
        assert j["user"]["role"] == "admin" and isinstance(j["token"], str)

    def test_login_wrong(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN["email"], "password": "wrong"})
        assert r.status_code == 401
        assert "incorrect" in r.json()["detail"]
        requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)  # reset counter

    def test_me(self, auth):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth)
        assert r.status_code == 200 and r.json()["email"] == ADMIN["email"]
        assert "password_hash" not in r.json()

    def test_brute_force_lockout(self):
        email = f"test_{uuid.uuid4().hex[:6]}@example.com"
        codes = [requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "x"}).status_code for _ in range(6)]
        assert codes[:5] == [401] * 5
        assert codes[5] == 429

    @pytest.mark.parametrize("method,path", [
        ("get", "/api/admin/stats"), ("post", "/api/admin/listings"), ("put", "/api/admin/listings/x"),
        ("patch", "/api/admin/listings/x"), ("delete", "/api/admin/listings/x"), ("post", "/api/admin/upload"),
        ("get", "/api/auth/me"),
    ])
    def test_admin_requires_token(self, method, path):
        r = getattr(requests, method)(f"{BASE_URL}{path}", json={})
        assert r.status_code == 401

    def test_invalid_token(self):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": "Bearer bad"})
        assert r.status_code == 401


# --- Admin CRUD + upload
class TestAdmin:
    def test_upload_and_serve(self, auth):
        r = requests.post(f"{BASE_URL}/api/admin/upload", headers=auth, files={"file": ("t.png", io.BytesIO(PNG), "image/png")})
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        assert url.startswith("/api/files/")
        g = requests.get(f"{BASE_URL}{url}")
        assert g.status_code == 200
        assert g.headers["content-type"].startswith("image/png")
        assert g.content == PNG
        pytest.uploaded = url

    def test_upload_bad_type(self, auth):
        r = requests.post(f"{BASE_URL}/api/admin/upload", headers=auth, files={"file": ("t.txt", io.BytesIO(b"hi"), "text/plain")})
        assert r.status_code == 400

    def test_files_404(self):
        assert requests.get(f"{BASE_URL}/api/files/tuacarigua/listings/nope.png").status_code == 404

    def test_crud_flow(self, auth, created_ids):
        s0 = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth).json()
        body = {"title": "TEST_Casa prueba", "category": "inmuebles", "type": "casa", "price": 50000, "currency": "USD",
                "zone": "TEST_Zona", "description": "desc", "images": [getattr(pytest, "uploaded", "/x.png")], "bedrooms": 3}
        r = requests.post(f"{BASE_URL}/api/admin/listings", headers=auth, json=body)
        assert r.status_code == 200, r.text
        lid = r.json()["id"]
        created_ids.append(lid)
        g = requests.get(f"{BASE_URL}/api/listings/{lid}").json()
        assert g["title"] == body["title"] and g["bedrooms"] == 3 and not g["featured"] and not g["sold"]
        s1 = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth).json()
        assert s1["total"] == s0["total"] + 1 and s1["inmuebles"] == s0["inmuebles"] + 1
        assert "TEST_Zona" in requests.get(f"{BASE_URL}/api/zones").json()

        # update
        body2 = {**body, "title": "TEST_Casa editada", "price": 55000, "currency": "Bs"}
        r = requests.put(f"{BASE_URL}/api/admin/listings/{lid}", headers=auth, json=body2)
        assert r.status_code == 200
        g = requests.get(f"{BASE_URL}/api/listings/{lid}").json()
        assert g["title"] == "TEST_Casa editada" and g["price"] == 55000 and g["currency"] == "Bs"
        assert g["created_at"] == r.json()["created_at"]

        # patch
        r = requests.patch(f"{BASE_URL}/api/admin/listings/{lid}", headers=auth, json={"featured": True, "sold": True})
        assert r.status_code == 200 and r.json()["featured"] and r.json()["sold"]
        s2 = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth).json()
        assert s2["sold"] == s1["sold"] + 1 and s2["featured"] == s1["featured"] + 1

        # delete
        assert requests.delete(f"{BASE_URL}/api/admin/listings/{lid}", headers=auth).status_code == 200
        assert requests.get(f"{BASE_URL}/api/listings/{lid}").status_code == 404
        assert requests.delete(f"{BASE_URL}/api/admin/listings/{lid}", headers=auth).status_code == 404

    def test_validation(self, auth):
        r = requests.post(f"{BASE_URL}/api/admin/listings", headers=auth, json={"title": "ab", "category": "x", "type": "c", "price": -1, "zone": "z"})
        assert r.status_code == 422

    def test_404s(self, auth):
        assert requests.put(f"{BASE_URL}/api/admin/listings/nope", headers=auth, json={"title": "TEST_x", "category": "otros", "type": "otro", "price": 1, "zone": "z"}).status_code == 404
        assert requests.patch(f"{BASE_URL}/api/admin/listings/nope", headers=auth, json={"sold": True}).status_code == 404
