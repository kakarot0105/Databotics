"""Pytest configuration for Databotics tests."""
import os
import pytest
from pathlib import Path


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Clean up test database before running tests."""
    test_db = Path("/tmp/databotics_test.db")
    if test_db.exists():
        test_db.unlink()
    
    # Set environment to use test database
    os.environ["DATABOTICS_DB"] = str(test_db)
    
    yield
    
    # Cleanup after tests
    if test_db.exists():
        test_db.unlink()
