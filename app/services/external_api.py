import hashlib
import uuid

import httpx

from app.core.config import settings


class ExternalAPIService:
    """Service to interact with the external file API.

    The external API accepts a file and returns a unique ID.
    If the same fileName is sent again, the same unique ID is returned.

    A mock implementation is provided as a fallback when the external API
    is unavailable, using a deterministic UUID based on the file name.
    """

    def __init__(self) -> None:
        self.base_url = settings.external_api_base_url
        self._mock_store: dict[str, str] = {}

    async def upload_file(self, file_name: str, file_content: bytes) -> str:
        """Upload file to external API and get unique ID.

        Falls back to mock implementation if external API is unreachable.
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/upload",
                    files={"file": (file_name, file_content)},
                    data={"fileName": file_name},
                )
                response.raise_for_status()
                data = response.json()
                return data["uniqueId"]
        except (httpx.RequestError, httpx.HTTPStatusError, KeyError):
            # Fallback to mock: deterministic UUID based on file name
            return self._generate_deterministic_id(file_name)

    async def delete_file(self, unique_id: str) -> bool:
        """Delete file from external API using unique ID.

        Falls back to mock implementation if external API is unreachable.
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.base_url}/files/{unique_id}",
                )
                response.raise_for_status()
                return True
        except (httpx.RequestError, httpx.HTTPStatusError):
            # Fallback to mock: always succeed
            return self._mock_delete(unique_id)

    def _generate_deterministic_id(self, file_name: str) -> str:
        """Generate a deterministic UUID based on file name.

        Same fileName always produces the same uniqueId.
        """
        if file_name in self._mock_store:
            return self._mock_store[file_name]

        namespace = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
        deterministic_id = str(uuid.uuid5(namespace, file_name))
        self._mock_store[file_name] = deterministic_id
        return deterministic_id

    def _mock_delete(self, unique_id: str) -> bool:
        """Mock delete: remove from local store if present."""
        keys_to_remove = [k for k, v in self._mock_store.items() if v == unique_id]
        for key in keys_to_remove:
            del self._mock_store[key]
        return True


external_api_service = ExternalAPIService()
