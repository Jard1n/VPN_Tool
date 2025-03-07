import os
import re
import requests
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

session = requests.Session()
session.headers.update({
    "User-Agent": "Surge iOS/3374"
})

REPLACE_BASE_URL = "https://raw.githubusercontent.com/Jard1n/VPN_Tool/main/Scripts/Fries/"

def download_file(url, output_folder="Surge/Module", is_js=False):
    os.makedirs(output_folder, exist_ok=True)
    parsed_url = urlparse(url)
    path_parts = parsed_url.path.strip('/').split('/')
    
    if not is_js:
        file_name = os.path.basename(parsed_url.path)
    else:
        prefix = path_parts[1]  # 提取前缀部分
        file_name = f"{prefix}.{os.path.basename(parsed_url.path)}"  # 生成前缀文件名

    file_path = os.path.join(output_folder, file_name)

    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()
        with open(file_path, "wb") as file:
            file.write(response.content)
        print(f"Downloaded: {file_path}")
        return file_path
    except requests.RequestException as e:
        print(f"Failed to download {url}. Error: {e}")
        return None

def clean_sgmodule_file(file_path):
    """
    删除 .sgmodule 文件中的 #!date 和 #!version 行
    """
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            lines = file.readlines()
        
        # 过滤掉包含 #!date 和 #!version 的行
        cleaned_lines = [line for line in lines if not line.startswith("#!date") and not line.startswith("#!version")]
        
        with open(file_path, "w", encoding="utf-8") as file:
            file.writelines(cleaned_lines)
        
        print(f"Cleaned #!date and #!version from: {file_path}")
    except Exception as e:
        print(f"Error cleaning file {file_path}: {e}")

def extract_script_paths(file_path):
    script_paths = []
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
            # 使用正则表达式提取 script-path
            script_paths = re.findall(r'script-path\s*=\s*(https?://[^\s]+\.js)', content)
    except Exception as e:
        print(f"Error reading file {file_path}: {e}")
    return script_paths

def replace_script_paths(file_path, script_paths, downloaded_js_files):
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()

        for script_path in script_paths:
            js_filename = os.path.basename(script_path)
            for downloaded_file in downloaded_js_files:
                if downloaded_file.endswith(js_filename):  # 匹配文件名
                    prefix = downloaded_file.split('.')[0]  # 获取前缀部分
                    if not downloaded_file.startswith(prefix + "."):
                        new_url = REPLACE_BASE_URL + f"{prefix}.{downloaded_file}"  # 生成新的 URL
                    else:
                        new_url = REPLACE_BASE_URL + downloaded_file  # 直接使用文件名，避免重复前缀
                    content = content.replace(script_path, new_url)

        with open(file_path, "w", encoding="utf-8") as file:
            file.write(content)
        print(f"Replaced script-path URLs and saved to: {file_path}")
    except Exception as e:
        print(f"Error replacing script-paths in file {file_path}: {e}")

def download_js_files(script_paths, output_folder="Scripts/Fries"):
    os.makedirs(output_folder, exist_ok=True)
    downloaded = set()  # 使用集合跟踪已下载的文件 URL
    downloaded_files = []  # 记录下载成功的文件名

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {}
        for url in script_paths:
            if url not in downloaded:
                futures[executor.submit(download_file, url, output_folder, is_js=True)] = url
                downloaded.add(url)

        for future in as_completed(futures):
            url = futures[future]
            try:
                file_path = future.result()
                if file_path:
                    downloaded_files.append(os.path.basename(file_path))
            except Exception as e:
                print(f"Failed to download {url}: {e}")

    return downloaded_files

def process_single_file(url):
    print(f"\nProcessing URL: {url}")

    sgmodule_file = download_file(url, is_js=False)

    if sgmodule_file:
        # 清理 .sgmodule 文件
        print("\nCleaning .sgmodule file...")
        clean_sgmodule_file(sgmodule_file)

        print("\nExtracting script paths...")
        script_paths = extract_script_paths(sgmodule_file)

        if script_paths:
            print(f"Found script paths: {script_paths}")

            print("\nDownloading JS files...")
            downloaded_js_files = download_js_files(script_paths)

            if downloaded_js_files:
                print("\nReplacing script paths in the .sgmodule file...")
                replace_script_paths(sgmodule_file, script_paths, downloaded_js_files)
        else:
            print("没有找到脚本路径URL.")

def process_multiple_files(url_list):
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {}
        for url in url_list:
            futures[executor.submit(process_single_file, url)] = url

        for future in as_completed(futures):
            try:
                future.result()  # 获取每个任务的执行结果
            except Exception as e:
                print(f"Error processing file from URL {futures[future]}: {e}")

if __name__ == "__main__":
    url_list = [
        "https://github.com/BiliUniverse/Enhanced/releases/latest/download/BiliBili.Enhanced.sgmodule",
        "https://github.com/BiliUniverse/Global/releases/latest/download/BiliBili.Global.sgmodule",
        "https://github.com/BiliUniverse/Redirect/releases/latest/download/BiliBili.Redirect.sgmodule",
        "https://github.com/BiliUniverse/ADBlock/releases/latest/download/BiliBili.ADBlock.sgmodule",
        "https://github.com/NSRingo/WeatherKit/releases/latest/download/iRingo.WeatherKit.sgmodule",
        "https://github.com/NSRingo/GeoServices/releases/latest/download/iRingo.Location.sgmodule",
        "https://github.com/NSRingo/GeoServices/releases/latest/download/iRingo.Maps.sgmodule"
    ]

    process_multiple_files(url_list)
