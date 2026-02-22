import subprocess
import json
import os

def check_notebooks():
    env = os.environ.copy()
    env["HTTP_PROXY"] = "http://127.0.0.1:2080"
    env["HTTPS_PROXY"] = "http://127.0.0.1:2080"
    env["NOTEBOOKLM_BL"] = "boq_labs-tailwind-frontend_20260218.03_p0"
    
    # JSON-RPC request for list_notebooks tool (assuming the command name)
    request = {
        "jsonrpc": "2.0",
        "method": "list_notebooks",
        "params": {},
        "id": 1
    }
    
    server_path = "/Users/johnsky/.local/bin/notebooklm-mcp"
    
    try:
        # We need to talk to the server over stdio
        process = subprocess.Popen(
            [server_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env
        )
        
        # We need to handle the initialization first (part of MCP protocol)
        init_request = {
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test-client", "version": "1.0.0"}
            },
            "id": 0
        }
        
        process.stdin.write(json.dumps(init_request) + "\n")
        process.stdin.flush()
        
        # Read initialization response
        init_response = process.stdout.readline()
        print("Initialization response received.")
        
        # Send initialized notification
        initialized_notification = {
            "jsonrpc": "2.0",
            "method": "notifications/initialized",
            "params": {}
        }
        process.stdin.write(json.dumps(initialized_notification) + "\n")
        process.stdin.flush()
        
        # Call notebook_list only
        list_request = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {
                "name": "notebook_list",
                "arguments": {}
            },
            "id": 2
        }
        process.stdin.write(json.dumps(list_request) + "\n")
        process.stdin.flush()
        
        list_response = process.stdout.readline()
        print("\nNotebook List Response:")
        print(json.dumps(json.loads(list_response), indent=2, ensure_ascii=False))
        
        process.terminate()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_notebooks()
