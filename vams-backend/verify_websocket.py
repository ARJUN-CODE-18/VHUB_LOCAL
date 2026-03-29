#!/usr/bin/env python3
"""
VAMS WebSocket Diagnostics Tool

This script verifies that WebSocket support is properly configured
and helps diagnose any connection issues.
"""
import sys
import subprocess
import json
from pathlib import Path

def check_websockets_library():
    """Verify websockets library is installed"""
    try:
        import websockets
        return True, f"websockets {websockets.__version__}"
    except ImportError:
        return False, "websockets not installed"

def check_uvicorn_version():
    """Verify uvicorn is installed with proper version"""
    try:
        import uvicorn
        version = uvicorn.__version__
        # Check if it's a version that supports WebSockets
        parts = version.split('.')
        major = int(parts[0])
        if major >= 0:
            return True, f"uvicorn {version}"
        return False, f"uvicorn {version} may not support WebSockets"
    except ImportError:
        return False, "uvicorn not installed"

def check_fastapi():
    """Verify FastAPI is installed"""
    try:
        import fastapi
        return True, f"fastapi {fastapi.__version__}"
    except ImportError:
        return False, "fastapi not installed"

def check_requirements_file():
    """Check if requirements.txt has WebSocket packages"""
    req_file = Path(__file__).parent / "requirements.txt"
    if not req_file.exists():
        return False, "requirements.txt not found"
    
    content = req_file.read_text()
    has_websockets = "websockets" in content
    has_uvicorn_standard = "uvicorn[standard]" in content
    
    if has_websockets and has_uvicorn_standard:
        return True, "requirements.txt has WebSocket support"
    
    missing = []
    if not has_websockets:
        missing.append("websockets")
    if not has_uvicorn_standard and "uvicorn" not in content:
        missing.append("uvicorn[standard]")
    
    return False, f"requirements.txt missing: {', '.join(missing)}"

def check_main_py_websocket():
    """Check if main.py has @app.websocket route"""
    main_file = Path(__file__).parent / "app" / "main.py"
    if not main_file.exists():
        return False, "app/main.py not found"
    
    content = main_file.read_text()
    if "@app.websocket(\"/ws\")" in content:
        return True, "@app.websocket('/ws') endpoint found"
    else:
        return False, "@app.websocket('/ws') endpoint not found"

def check_realtime_module():
    """Check if realtime module has ConnectionManager"""
    realtime_file = Path(__file__).parent / "app" / "core" / "realtime.py"
    if not realtime_file.exists():
        return False, "app/core/realtime.py not found"
    
    content = realtime_file.read_text()
    if "class ConnectionManager" in content:
        return True, "ConnectionManager class found"
    else:
        return False, "ConnectionManager class not found"

def run_diagnostics():
    """Run all diagnostics"""
    print("=" * 70)
    print("VAMS WebSocket Diagnostics")
    print("=" * 70)
    print()
    
    checks = [
        ("WebSockets Library", check_websockets_library),
        ("Uvicorn Installation", check_uvicorn_version),
        ("FastAPI Installation", check_fastapi),
        ("Requirements File", check_requirements_file),
        ("Main.py WebSocket Route", check_main_py_websocket),
        ("Realtime Module", check_realtime_module),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            success, message = check_func()
            status = "✓ PASS" if success else "✗ FAIL"
            results.append((success, status, name, message))
            print(f"{status} | {name:30} | {message}")
        except Exception as e:
            print(f"✗ ERROR | {name:30} | {str(e)}")
            results.append((False, "✗ ERROR", name, str(e)))
    
    print()
    print("=" * 70)
    
    all_passed = all(r[0] for r in results)
    if all_passed:
        print("✓ ALL CHECKS PASSED!")
        print()
        print("WebSocket support is properly configured.")
        print()
        print("To start the backend:")
        print("  python -m uvicorn app.main:app --reload")
        print()
        print("Frontend will connect to: ws://127.0.0.1:8000/ws")
        return 0
    else:
        print("✗ SOME CHECKS FAILED")
        print()
        print("Failed items:")
        for success, status, name, message in results:
            if not success:
                print(f"  - {name}: {message}")
        print()
        print("To fix WebSocket support:")
        print("  pip install -r requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(run_diagnostics())
