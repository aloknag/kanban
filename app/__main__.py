import sys
import argparse
import uvicorn
from pathlib import Path
from app.main import create_app


def main():
    parser = argparse.ArgumentParser(
        description="Kanban board for AI agents",
        prog="kanban"
    )
    parser.add_argument(
        "command",
        choices=["serve"],
        help="Command to run"
    )
    parser.add_argument(
        "--folder",
        required=True,
        help="Data folder path"
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host to bind to (default: 127.0.0.1; pass --host 0.0.0.0 to expose on the network)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind to (default: 8000)"
    )

    args = parser.parse_args()

    # Validate folder exists
    data_folder = Path(args.folder)
    if not data_folder.exists():
        print(f"Error: Folder does not exist: {args.folder}")
        sys.exit(1)

    if args.command == "serve":
        app = create_app(data_folder)
        uvicorn.run(
            app,
            host=args.host,
            port=args.port,
            log_level="info"
        )


if __name__ == "__main__":
    main()
