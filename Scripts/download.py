import os
import requests
import sys

# --- 配置 ---
# 源仓库和路径信息
BASE_URL = "https://raw.githubusercontent.com/SouthAlley/ke/main/Surge/"

# 本地目录结构
LOCAL_RULES_DIR = "Surge/Module/local"
OUTPUT_DIR = "Surge/Module"

# 在.sgmodule文件中用于替换内容的占位符
PLACEHOLDER = "#!!<CUSTOM_RULES>!!#"

def process_module(local_filename):
    """
    下载、处理并保存单个模块文件。
    """
    try:
        # 1. 构造文件名和路径
        base_name = os.path.splitext(local_filename)[0]
        remote_filename = f"{base_name}_.sgmodule"
        download_url = f"{BASE_URL}{remote_filename}"
        local_rule_path = os.path.join(LOCAL_RULES_DIR, local_filename)
        output_path = os.path.join(OUTPUT_DIR, remote_filename)
        
        print(f"-> 开始处理模块: {base_name}")
        
        # 2. 下载远程模块文件
        response = requests.get(download_url)
        response.raise_for_status() 
        remote_content = response.text
        
        # 3. 读取本地自定义规则
        with open(local_rule_path, 'r', encoding='utf-8') as f:
            local_rules = f.read()

        # 4. 替换内容
        customized_content = remote_content.replace(PLACEHOLDER, local_rules)
        
        # 如果找不到占位符，给出警告并把规则追加到文件末尾
        if PLACEHOLDER not in remote_content:
            print(f"   [警告] 在 {remote_filename} 中未找到占位符 '{PLACEHOLDER}'。将把本地规则追加到文件末尾。")
            customized_content = remote_content.strip() + "\n\n" + local_rules

        # 5. 保存处理后的文件
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(customized_content)
        print(f"   [成功] 已生成定制化模块: {output_path}")

    except requests.exceptions.RequestException as e:
        print(f"   [错误] 下载 {download_url} 失败: {e}", file=sys.stderr)
    except FileNotFoundError:
        print(f"   [错误] 本地规则文件未找到: {local_rule_path}", file=sys.stderr)
    except Exception as e:
        print(f"   [错误] 处理 {local_filename} 时发生未知错误: {e}", file=sys.stderr)

def main():
    """
    脚本主入口。
    """
    print("--- 开始执行模块更新脚本 ---")
    
    if not os.path.isdir(LOCAL_RULES_DIR):
        print(f"本地规则目录 '{LOCAL_RULES_DIR}' 不存在，脚本结束。")
        return

    # 遍历本地规则目录下的所有.txt文件
    local_files = [f for f in os.listdir(LOCAL_RULES_DIR) if f.endswith(".txt")]
    
    if not local_files:
        print("在 'local' 目录中未找到任何 .txt 规则文件。")
        
    for filename in local_files:
        process_module(filename)
    
    print("--- 脚本执行完毕 ---")

if __name__ == "__main__":
    main()
