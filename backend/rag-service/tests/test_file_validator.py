"""Tests for file validator security checks."""


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


def test_validate_method_success():
    v = FileValidator()
    assert v.validate(content_type="application/pdf", file_size_bytes=1024, file_name="doc.pdf") is True
    assert v.validate(content_type="text/plain; charset=utf-8", file_size_bytes=50, file_name="test.txt") is True


def test_validate_method_failures():
    import pytest

    v = FileValidator()
    with pytest.raises(ValueError, match="Unsupported content type"):
        v.validate(content_type="application/x-msdownload", file_size_bytes=1024)

    with pytest.raises(ValueError, match="File size .* is invalid"):
        v.validate(content_type="application/pdf", file_size_bytes=0)

    with pytest.raises(ValueError, match="null bytes"):
        v.validate(content_type="application/pdf", file_size_bytes=1024, file_name="bad\x00name.pdf")

    with pytest.raises(ValueError, match="Unsafe or invalid storage path"):
        v.validate(content_type="application/pdf", file_size_bytes=1024, storage_path="../../etc/passwd")
