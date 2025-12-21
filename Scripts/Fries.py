import os
import re
import requests
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- 全局配置 ---

# 使用 requests.Session 进行连接池复用和保持一致的请求头。
session = requests.Session()
session.headers.update({
    "User-Agent": "Surge iOS/3374"  # 一个常见的 Surge User Agent
})

# 新脚本文件将被托管的基础 URL。
REPLACE_BASE_URL = "https://raw.githubusercontent.com/Jard1n/VPN_Tool/main/Scripts/Fries/"

# --- 主要功能函数 ---

def download_file(url, output_folder="Surge/Module", is_js=False):
    os.makedirs(output_folder, exist_ok=True)
    parsed_url = urlparse(url)
    
    # URL的路径部分，例如: /BiliUniverse/Enhanced/releases/...
    path_parts = parsed_url.path.strip('/').split('/')

    if not is_js:
        # 对于 .sgmodule 文件，直接使用原始文件名。
        file_name = os.path.basename(parsed_url.path)
    else:
        if len(path_parts) > 1:
            prefix = path_parts[1]
            file_name = f"{prefix}.{os.path.basename(parsed_url.path)}"
        else:
            # 如果URL路径意外地很短，则使用备用方案。
            file_name = os.path.basename(parsed_url.path)

    file_path = os.path.join(output_folder, file_name)

    try:
        response = session.get(url, timeout=15)
        response.raise_for_status()  # 如果状态码是 4xx 或 5xx，则抛出异常
        with open(file_path, "wb") as file:
            file.write(response.content)
        print(f"已下载: {file_path}")
        return file_path
    except requests.RequestException as e:
        print(f"下载 {url} 失败. 错误: {e}")
        return None

def clean_sgmodule_file(file_path):
    """
    从 .sgmodule 文件中移除元数据行，如 #!date 和 #!version。

    参数:
        file_path (str): .sgmodule 文件的路径。
    """
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            lines = file.readlines()
        
        # 过滤掉不需要的行
        cleaned_lines = [line for line in lines if not line.strip().startswith(("#!date", "#!version"))]
        
        with open(file_path, "w", encoding="utf-8") as file:
            file.writelines(cleaned_lines)
        
        print(f"已清理元数据: {file_path}")
    except Exception as e:
        print(f"清理文件 {file_path} 时出错: {e}")

def extract_script_paths(file_path):
    script_paths = []
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
            # 正则表达式用于查找 'script-path = https://.../script.js'
            script_paths = re.findall(r'script-path\s*=\s*(https?://[^\s,]+\.js)', content)
    except Exception as e:
        print(f"读取文件 {file_path} 时出错: {e}")
    return script_paths

def replace_script_paths(file_path, url_to_new_filename_map):
    if not url_to_new_filename_map:
        return
        
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()

        # 遍历映射字典，并将每个旧 URL 替换为新 URL。
        for original_url, new_filename in url_to_new_filename_map.items():
            new_url = REPLACE_BASE_URL + new_filename
            content = content.replace(original_url, new_url)
            print(f"  - 已替换 '{original_url.split('/')[-1]}' -> '{new_url.split('/')[-1]}'")

        with open(file_path, "w", encoding="utf-8") as file:
            file.write(content)
        print(f"已替换所有 script-path URL: {file_path}")
    except Exception as e:
        print(f"在 {file_path} 中替换 script-path 时出错: {e}")

def download_js_files(script_urls, output_folder="Scripts/Fries"):
    os.makedirs(output_folder, exist_ok=True)
    # 使用字典来映射原始 URL 和它们的新文件名，这比之前的方法更健壮。
    url_to_new_filename_map = {}
    
    # 使用集合来避免重复下载同一个 URL。
    unique_urls = set(script_urls)

    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_url = {executor.submit(download_file, url, output_folder, is_js=True): url for url in unique_urls}

        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                # download_file 的结果是本地文件路径
                file_path = future.result()
                if file_path:
                    # 将原始 URL 映射到新的文件名
                    url_to_new_filename_map[url] = os.path.basename(file_path)
            except Exception as e:
                print(f"处理 {url} 的下载时发生错误: {e}")

    return url_to_new_filename_map


def process_sgmodule_url(url):
    print(f"\n{'='*20}\n正在处理 URL: {url}\n{'='*20}")

    # 1. 下载主要的 .sgmodule 文件
    sgmodule_file = download_file(url, output_folder="Surge/Module", is_js=False)
    if not sgmodule_file:
        print("主模块下载失败，已停止处理此 URL。")
        return

    # 2. 清理 .sgmodule 文件中的元数据
    clean_sgmodule_file(sgmodule_file)

    # 3. 从中提取所有的 script-path URL
    script_urls_to_download = extract_script_paths(sgmodule_file)

    if script_urls_to_download:
        print(f"\n找到 {len(script_urls_to_download)} 个脚本路径需要处理。")

        # 4. 并发下载所有依赖的 .js 文件
        print("\n正在下载依赖的 JS 文件...")
        url_map = download_js_files(script_urls_to_download, output_folder="Scripts/Fries")

        # 5. 在 .sgmodule 文件中用新 URL 替换旧 URL
        if url_map:
            print("\n正在替换 .sgmodule 文件中的脚本路径...")
            replace_script_paths(sgmodule_file, url_map)
        else:
            print("没有JS文件被成功下载，跳过替换步骤。")
    else:
        print("\n模块中未找到 script-path URL，无需进一步操作。")
    
    print(f"\n处理完成: {url}")


def process_multiple_urls(url_list):
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_url = {executor.submit(process_sgmodule_url, url): url for url in url_list}

        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                future.result()
            except Exception as e:
                print(f"处理 URL {url} 时发生严重错误: {e}")

if __name__ == "__main__":
    url_list = [
        "https://github.com/DualSubs/YouTube/releases/latest/download/DualSubs.YouTube.sgmodule",
        "https://github.com/BiliUniverse/Enhanced/releases/latest/download/BiliBili.Enhanced.sgmodule",
        "https://github.com/BiliUniverse/Global/releases/latest/download/BiliBili.Global.sgmodule",
        "https://github.com/BiliUniverse/Redirect/releases/latest/download/BiliBili.Redirect.sgmodule",
        "https://github.com/BiliUniverse/ADBlock/releases/latest/download/BiliBili.ADBlock.sgmodule",
        "https://github.com/NSRingo/WeatherKit/releases/latest/download/iRingo.WeatherKit.sgmodule",
        "https://github.com/NSRingo/LocationService/releases/latest/download/iRingo.LocationService.sgmodule",
        "https://github.com/NSRingo/Maps/releases/latest/download/iRingo.Maps.sgmodule",
        "https://github.com/DualSubs/Spotify/releases/latest/download/DualSubs.Spotify.sgmodule"
    ]
    
    print("开始批量处理 .sgmodule 文件...")
    process_multiple_urls(url_list)
    print("\n批量处理完成。")
