from __future__ import annotations

import importlib
import sys
from pathlib import Path


def _resolve_proto_root() -> Path:
    here = Path(__file__).resolve().parent
    for parent in [here, *here.parents]:
        candidate = parent / "proto"
        if (candidate / "ai_models.proto").exists():
            return candidate
    raise FileNotFoundError("Unable to locate proto directory containing ai_models.proto")


def _alias_generated_pb2(proto_name: str) -> None:
    module = importlib.import_module(f"app.grpc_stubs.{proto_name}_pb2")
    sys.modules.setdefault(f"{proto_name}_pb2", module)


def _ensure_stubs(proto_name: str) -> None:
    from grpc_tools import protoc

    here = Path(__file__).resolve().parent
    proto_root = _resolve_proto_root()
    proto_file = proto_root / f"{proto_name}.proto"
    if not proto_file.exists():
        raise FileNotFoundError(f"Proto file not found: {proto_file}")

    generated_pb2 = here / f"{proto_name}_pb2.py"
    generated_pb2_grpc = here / f"{proto_name}_pb2_grpc.py"
    has_generated = generated_pb2.exists() and generated_pb2_grpc.exists()
    proto_mtime = proto_file.stat().st_mtime
    generated_up_to_date = has_generated and generated_pb2.stat().st_mtime >= proto_mtime

    if generated_up_to_date:
        try:
            _alias_generated_pb2(proto_name)
            importlib.import_module(f"app.grpc_stubs.{proto_name}_pb2_grpc")
            return
        except ImportError:
            # Fall through to regeneration if generated modules cannot be imported.
            pass

    result = protoc.main(
        [
            "grpc_tools.protoc",
            f"-I{proto_root}",
            f"--python_out={here}",
            f"--grpc_python_out={here}",
            str(proto_file),
        ]
    )
    if result != 0:
        raise RuntimeError(f"Failed to generate gRPC stubs for {proto_name}.proto")

    _alias_generated_pb2(proto_name)
    importlib.import_module(f"app.grpc_stubs.{proto_name}_pb2_grpc")


def ensure_ai_models_stubs() -> None:
    _ensure_stubs("ai_models")


def ensure_rag_stubs() -> None:
    _ensure_stubs("rag")
