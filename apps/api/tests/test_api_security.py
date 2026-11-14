"""
MediRead AI - API Security & Integration Tests
Validates JWT authentication, RLS multi-tenant boundary, caregiver permission levels,
and upload validation.
"""

import unittest
import uuid
import io
import jwt
from datetime import datetime, timezone, timedelta
from PIL import Image
from starlette.testclient import TestClient

from app.main import app
from app.config import settings


def generate_test_jwt(user_id: uuid.UUID, secret: str = settings.SUPABASE_JWT_SECRET, expired: bool = False) -> str:
    now = datetime.now(timezone.utc)
    exp = now - timedelta(hours=1) if expired else now + timedelta(hours=1)
    payload = {
        "sub": str(user_id),
        "email": f"user_{str(user_id)[:6]}@mediread.ai",
        "role": "authenticated",
        "aud": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


class TestApiSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.patient_a = uuid.UUID("11111111-1111-1111-1111-111111111101")
        self.patient_b = uuid.UUID("11111111-1111-1111-1111-111111111102")
        self.token_a = generate_test_jwt(self.patient_a)
        self.token_b = generate_test_jwt(self.patient_b)

    def test_health_probes(self):
        res = self.client.get("/health/live")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "alive")

        res_ready = self.client.get("/health/ready")
        self.assertIn(res_ready.status_code, (200, 503))

    def test_unauthenticated_requests_rejected(self):
        # Missing Authorization header
        res = self.client.get("/api/v1/documents")
        self.assertEqual(res.status_code, 401)
        self.assertIn("unauthenticated", res.json()["detail"])

    def test_expired_jwt_rejected(self):
        expired_token = generate_test_jwt(self.patient_a, expired=True)
        res = self.client.get("/api/v1/documents", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(res.status_code, 401)

    def test_forged_signature_jwt_rejected(self):
        fake_token = generate_test_jwt(self.patient_a, secret="wrong-secret-key-that-does-not-match")
        res = self.client.get("/api/v1/documents", headers={"Authorization": f"Bearer {fake_token}"})
        self.assertEqual(res.status_code, 401)

    def test_upload_rejects_empty_file(self):
        res = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            files={"file": ("test.png", b"", "image/png")},
        )
        self.assertEqual(res.status_code, 400)

    def test_upload_rejects_unsupported_mime(self):
        res = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            files={"file": ("malicious.exe", b"MZexecutable", "application/x-msdownload")},
        )
        self.assertEqual(res.status_code, 415)

    def test_upload_rejects_corrupted_image(self):
        res = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            files={"file": ("fake.png", b"not-a-real-png-bytes", "image/png")},
        )
        self.assertEqual(res.status_code, 400)

    def test_valid_image_upload_and_isolation(self):
        # 1. Patient A uploads a valid test image
        img = Image.new("RGB", (400, 400), color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)

        res = self.client.post(
            "/api/v1/documents/upload",
            headers={"Authorization": f"Bearer {self.token_a}"},
            files={"file": ("phiếu_xét_nghiệm.png", buf.getvalue(), "image/png")},
            data={"doc_type": "lab_report"},
        )
        self.assertEqual(res.status_code, 200)
        doc_id = res.json()["document_id"]

        # 2. Patient A can view the document
        res_a = self.client.get(f"/api/v1/documents/{doc_id}", headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(res_a.status_code, 200)

        # 3. Patient B CANNOT view Patient A's document (Strict Multi-tenant isolation)
        res_b = self.client.get(f"/api/v1/documents/{doc_id}", headers={"Authorization": f"Bearer {self.token_b}"})
        self.assertEqual(res_b.status_code, 403)

    def test_caregiver_permission_workflow(self):
        caregiver_id = uuid.uuid4()
        token_caregiver = generate_test_jwt(caregiver_id)

        # 1. Caregiver cannot link to themselves
        res_self = self.client.post(
            "/api/v1/care-links/request",
            headers={"Authorization": f"Bearer {token_caregiver}"},
            json={"patient_id": str(caregiver_id)},
        )
        self.assertEqual(res_self.status_code, 400)

        # 2. Caregiver requests link to Patient A
        res_req = self.client.post(
            "/api/v1/care-links/request",
            headers={"Authorization": f"Bearer {token_caregiver}"},
            json={"patient_id": str(self.patient_a)},
        )
        self.assertEqual(res_req.status_code, 200)
        link_id = res_req.json()["link"]["id"]

        # 3. ONLY Patient A can accept (Caregiver cannot accept their own request)
        res_caregiver_accept = self.client.post(
            f"/api/v1/care-links/{link_id}/accept",
            headers={"Authorization": f"Bearer {token_caregiver}"},
        )
        self.assertEqual(res_caregiver_accept.status_code, 403)

        # 4. Patient A accepts connection
        res_patient_accept = self.client.post(
            f"/api/v1/care-links/{link_id}/accept",
            headers={"Authorization": f"Bearer {self.token_a}"},
        )
        self.assertEqual(res_patient_accept.status_code, 200)

    def test_demo_tokens_allowed_in_dev(self):
        # 1. Plain demo token should not crash with 'Not enough segments'
        res = self.client.get("/api/v1/documents", headers={"Authorization": "Bearer demo_token"})
        self.assertEqual(res.status_code, 200)

        # 2. Caregiver demo token
        res_caregiver = self.client.get("/api/v1/documents", headers={"Authorization": "Bearer demo_caregiver"})
        self.assertEqual(res_caregiver.status_code, 200)

    def test_auth_login_endpoint(self):
        # 1. Login with phone number
        res = self.client.post(
            "/api/v1/auth/login",
            json={"phone": "0912345678", "role": "patient"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("access_token", data)
        token = data["access_token"]

        # 2. Use the minted JWT to query /auth/me
        res_me = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.json()["role"], "patient")


if __name__ == "__main__":
    unittest.main()
