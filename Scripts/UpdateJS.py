import os
import requests
import re
from requests.exceptions import RequestException

def download_file_from_comment(file_path):
    try:
        with open(file_path, 'rb') as file:
            content = file.read()

            match = re.search(r'(引用地址：https?://[^\s]*\.js)', content.decode('utf-8'))
            if match:
                full_url = match.group(1)
                download_url = full_url.replace('引用地址：', '')

                headers = {
                    'User-Agent': 'Surge iOS/3374'
                }

                response = requests.get(download_url, headers=headers)
                response.raise_for_status()

                relative_path = os.path.relpath(file_path, 'Scripts')
                new_file_path = os.path.join("Scripts", f"{os.path.splitext(relative_path)[0]}.js")

                with open(new_file_path, 'wb') as new_file:
                    new_file.write(f"// 引用地址：{download_url}\n".encode('utf-8'))
                    new_file.write(response.content)

                print(f"文件 {new_file_path} 下载成功！")
            else:
                print(f"在文件 {file_path} 中未找到引用地址")
    except RequestException as e:
        print(f"网络请求错误：{e}")
    except Exception as e:
        print(f"发生错误：{e}")

folder_path = "Scripts"

for root, dirs, files in os.walk(folder_path):
    for filename in files:
        file_path = os.path.join(root, filename)
        if re.search(r'\.js$', filename):
            download_file_from_comment(file_path)
