import tarfile
import io
import time
import os
import boto3
from contextlib import closing

def send(event, context, status, data, resource_id=None, no_echo=False):
    response_body = {}
    response_body["Status"] = status
    response_body["Reason"] = 'See the details in CloudWatch Log Stream: ' + context.log_stream_name
    response_body["PhysicalResourceId"] = resource_id or context.log_stream_name
    response_body["StackId"] = event["StackId"]
    response_body["RequestId"] = event["RequestId"]
    response_body["LogicalResourceId"] = event["LogicalResourceId"]
    response_body["NoEcho"] = no_echo
    response_body["Data"] = data
    return response_body

def contents_to_tar(contents, tar, name):
    with closing(io.BytesIO(contents.encode())) as obj:
        tarinfo = tarfile.TarInfo(name)
        tarinfo.size = len(obj.getvalue())
        tarinfo.mtime = time.time()
        tar.addfile(tarinfo, fileobj=obj)

def on_create(event, context):
    iot = boto3.client("iot")
    s3 = boto3.client("s3")
    certs = iot.create_keys_and_certificate(setAsActive=True)
    prefix = certs["certificateId"][0:10]
    filename = "/tmp/" + prefix + ".tar.gz"
    with tarfile.open(filename, "w:gz") as tar:
        contents_to_tar(certs["certificatePem"], tar, prefix + ".pem")
        contents_to_tar(certs["keyPair"]["PrivateKey"], tar, prefix + ".private.key")
        contents_to_tar(certs["keyPair"]["PublicKey"], tar, prefix + ".public.key")
    key = "certs/" + event["ResourceProperties"]["ThingName"] + "/keys.tar.gz"
    s3.upload_file(filename, os.environ["BucketName"], key)
    response_data = {
        "CertificateArn": certs["certificateArn"],
        "ThingName": event["ResourceProperties"]["ThingName"],
        "CertKey": key
    }
    return send(event, context, "SUCCESS", response_data, certs["certificateId"])

def on_update(event, context):
    return send(event, context, "SUCCESS", event["ResourceProperties"], event["PhysicalResourceId"])

def on_delete(event, context):
    iot = boto3.client("iot")
    iot.update_certificate(
        certificateId=event["PhysicalResourceId"],
        newStatus="INACTIVE"
    )
    iot.delete_certificate(
        certificateId=event["PhysicalResourceId"],
        forceDelete=True
    )
    return send(event, context, "SUCCESS", event["ResourceProperties"], event["PhysicalResourceId"])


def handler(event, context):
    handlers = {
        "Create": on_create,
        "Update": on_update,
        "Delete": on_delete
    }
    return handlers[event["RequestType"]](event, context)
