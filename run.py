import os

def main() -> None:
    try:
        # optional: load .env if python-dotenv is installed
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    reload_flag = os.environ.get("RELOAD", "false").lower() in ("1", "true", "yes")

    import uvicorn

    uvicorn.run("api_server:app", host=host, port=port, reload=reload_flag)


if __name__ == "__main__":
    main()
