"""Tests for file validator security checks."""

import os
import tempfile

import pytest
from app.security.file_validator import FileValidator


def test_valid_content_type():
    v = FileValidator()
    assert v.validate_content_type("application/pdf") is True
    assert v.validate_content_type("text/plain") is True


def test_invalid_content_type():
    v = FileValidator()
    assert v.validate_content_type("application/x-executable") is False
    assert v.validate_content_type("") is False


def test_valid_file_size():
    v = FileValidator()
    assert v.validate_file_size(1024) is True


def test_invalid_file_size_zero():
    v = FileValidator()
    assert v.validate_file_size(0) is False


def test_invalid_file_size_too_large():
    v = FileValidator()
    # Max is 300 MB by default
    assert v.validate_file_size(400 * 1024 * 1024) is False
