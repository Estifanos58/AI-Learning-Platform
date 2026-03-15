from __future__ import annotations

import importlib
from pathlib import Path


def ensure_ai_models_stubs() -> None:
    try:
        importlib.import_module("app.grpc_stubs.ai_models_pb2")
        importlib.import_module("app.grpc_stubs.ai_models_pb2_grpc")
        return
    except ImportError:
        pass

    from grpc_tools import protoc

    here = Path(__file__).resolve().parent
    project_root = here.parents[2]
    proto_file = project_root / "proto" / "ai_models.proto"
    if not proto_file.exists():
        raise FileNotFoundError(f"Proto file not found: {proto_file}")

    result = protoc.main(
        [
            "grpc_tools.protoc",
            f"-I{project_root / 'proto'}",
            f"--python_out={here}",
            f"--grpc_python_out={here}",
            str(proto_file),
        ]
    )
    if result != 0:
        raise RuntimeError("Failed to generate gRPC stubs for ai_models.proto")
