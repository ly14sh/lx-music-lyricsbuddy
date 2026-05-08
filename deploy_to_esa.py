"""
Deploy LX Music Web PWA to ESA Pages.
Usage: python deploy_to_esa.py [routine_name]
"""
import os
import sys
import io
import time
import json
import zipfile
import requests

from alibabacloud_esa20240910.client import Client as Esa20240910Client
from alibabacloud_esa20240910 import models as esa_models
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_tea_openapi import models as api_models
from alibabacloud_tea_util import models as util_models


def load_credentials():
    """Load credentials from ~/.alibabacloud/credentials"""
    creds_path = os.path.join(os.path.expanduser("~"), ".alibabacloud", "credentials")
    if os.path.exists(creds_path):
        import configparser
        cp = configparser.ConfigParser()
        cp.read(creds_path, encoding="utf-8")
        if cp.has_section("default"):
            ak = cp.get("default", "access_key_id", fallback=None)
            sk = cp.get("default", "access_key_secret", fallback=None)
            if ak and sk:
                return ak, sk
    return None, None

AK, SK = load_credentials()
if not AK:
    print("ERROR: No credentials found in ~/.alibabacloud/credentials")
    sys.exit(1)

def create_client():
    config = open_api_models.Config(
        access_key_id=AK,
        access_key_secret=SK,
        region_id=os.environ.get("ALIBABA_CLOUD_REGION_ID", "cn-hangzhou"),
        endpoint="esa.cn-hangzhou.aliyuncs.com",
    )
    return Esa20240910Client(config)


def deploy_folder(name: str, folder_path: str, description: str = ""):
    """Deploy static directory to ESA Pages"""
    client = create_client()

    # 1. Create routine (skip if exists)
    print(f"[1/7] Creating routine '{name}'...")
    try:
        client.create_routine(
            esa_models.CreateRoutineRequest(name=name, description=description)
        )
        print(f"  -> Created new routine")
    except Exception as e:
        err = str(e)
        if "RoutineNameAlreadyExist" in err or "RoutineAlreadyExist" in err:
            print(f"  -> Routine already exists, reusing")
        else:
            raise

    # 2. Create assets code version
    print(f"[2/7] Creating assets code version...")
    params = api_models.Params(
        action="CreateRoutineWithAssetsCodeVersion",
        version="2024-09-10", protocol="https", method="POST",
        auth_type="AK", body_type="json", req_body_type="json",
        style="RPC", pathname="/",
    )
    body = {"Name": name, "CodeDescription": description}
    request = api_models.OpenApiRequest(body=body)
    runtime = util_models.RuntimeOptions()
    result = client.call_api(params, request, runtime)
    oss_config = result.get("body", {}).get("OssPostConfig", {})
    code_version = result.get("body", {}).get("CodeVersion")
    print(f"  -> Code version: {code_version}")

    # 3. Package and upload zip
    print(f"[3/7] Packaging and uploading zip...")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(folder_path):
            for f in files:
                full = os.path.join(root, f)
                rel = os.path.relpath(full, folder_path).replace(os.sep, "/")
                zf.write(full, f"assets/{rel}")
    zip_size = buf.tell()
    buf.seek(0)
    print(f"  -> Zip size: {zip_size} bytes")

    form_data = {
        "OSSAccessKeyId": oss_config["OSSAccessKeyId"],
        "Signature": oss_config["Signature"],
        "policy": oss_config["Policy"],
        "key": oss_config["Key"],
    }
    if oss_config.get("XOssSecurityToken"):
        form_data["x-oss-security-token"] = oss_config["XOssSecurityToken"]
    
    resp = requests.post(oss_config["Url"], data=form_data, files={"file": buf.getvalue()})
    print(f"  -> Upload status: {resp.status_code}")

    # 4. Wait for version ready
    print(f"[4/7] Waiting for version to be ready...")
    for i in range(300):
        info = client.call_api(
            api_models.Params(
                action="GetRoutineCodeVersionInfo", version="2024-09-10",
                protocol="https", method="GET", auth_type="AK",
                body_type="json", req_body_type="json", style="RPC", pathname="/",
            ),
            api_models.OpenApiRequest(query={"Name": name, "CodeVersion": code_version}),
            util_models.RuntimeOptions(),
        )
        status = info.get("body", {}).get("Status", "").lower()
        if status == "available":
            print(f"  -> Version ready!")
            break
        if status not in ("", "init"):
            raise RuntimeError(f"Build failed with status: {status}")
        if i % 5 == 0:
            print(f"  -> Status: {status or 'init'}... ({i}s)")
        time.sleep(1)

    # 5. Deploy to staging
    print(f"[5/7] Deploying to staging...")
    client.call_api(
        api_models.Params(
            action="CreateRoutineCodeDeployment", version="2024-09-10",
            protocol="https", method="POST", auth_type="AK",
            body_type="json", req_body_type="json", style="RPC", pathname="/",
        ),
        api_models.OpenApiRequest(query={
            "Name": name, "Env": "staging", "Strategy": "percentage",
            "CodeVersions": json.dumps([{"Percentage": 100, "CodeVersion": code_version}]),
        }),
        util_models.RuntimeOptions(),
    )
    print(f"  -> Staging deployed")

    # 6. Deploy to production
    print(f"[6/7] Deploying to production...")
    client.call_api(
        api_models.Params(
            action="CreateRoutineCodeDeployment", version="2024-09-10",
            protocol="https", method="POST", auth_type="AK",
            body_type="json", req_body_type="json", style="RPC", pathname="/",
        ),
        api_models.OpenApiRequest(query={
            "Name": name, "Env": "production", "Strategy": "percentage",
            "CodeVersions": json.dumps([{"Percentage": 100, "CodeVersion": code_version}]),
        }),
        util_models.RuntimeOptions(),
    )
    print(f"  -> Production deployed")

    # 7. Get access URL
    print(f"[7/7] Getting access URL...")
    routine = client.get_routine(esa_models.GetRoutineRequest(name=name))
    domain = routine.body.default_related_record
    url = f"https://{domain}" if domain else None
    print(f"  -> Access URL: {url}")

    return url


if __name__ == "__main__":
    routine_name = sys.argv[1] if len(sys.argv) > 1 else "lx-music-web"
    dist_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
    
    if not os.path.exists(dist_path):
        print(f"ERROR: dist/ directory not found at {dist_path}")
        sys.exit(1)

    print(f"Deploying to ESA Pages...")
    print(f"  Routine: {routine_name}")
    print(f"  Source:  {dist_path}")
    print()

    url = deploy_folder(routine_name, dist_path, description="LX Music Web PWA Player")
    print()
    print(f"{'='*50}")
    print(f"Deployment complete!")
    print(f"Access URL: {url}")
    print(f"{'='*50}")
