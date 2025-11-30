import os
import requests
import sys

# --- 配置 ---
BASE_URL = "https://raw.githubusercontent.com/SouthAlley/ke/main/Surge/"
LOCAL_RULES_DIR = "Surge/Module/local"
OUTPUT_DIR = "Surge/Module"
PLACEHOLDER = "#!!<CUSTOM_RULES>!!#"
DELETE_MARKER = "[DELETE]" # 用于分隔添加和删除内容的分隔符

def process_module(local_filename):
    """
    下载、处理（删除和添加）并保存单个模块文件。
    """
    try:
        # 1. 构造文件名和路径
        base_name = os.path.splitext(local_filename)[0]
        remote_filename = f"{base_name}.sgmodule"
        download_url = f"{BASE_URL}{remote_filename}"
        local_rule_path = os.path.join(LOCAL_RULES_DIR, local_filename)
        output_path = os.path.join(OUTPUT_DIR, remote_filename)
        
        print(f"-> 开始处理模块: {base_name}")
        
        # 2. 下载远程模块文件
        response = requests.get(download_url)
        response.raise_for_status() 
        remote_content = response.text
        
        # 3. 读取本地自定义规则文件
        with open(local_rule_path, 'r', encoding='utf-8') as f:
            local_content = f.read()

        # 4. 解析本地文件，分离添加和删除的规则  <-- 新增逻辑
        add_rules = local_content
        delete_rules_str = ""
        
        if DELETE_MARKER in local_content:
            parts = local_content.split(DELETE_MARKER, 1)
            add_rules = parts[0]
            delete_rules_str = parts[1]

        # 5. 执行删除操作  <-- 新增逻辑
        content_after_delete = remote_content
        lines_to_delete = {line.strip() for line in delete_rules_str.strip().splitlines() if line.strip()}
        
        if lines_to_delete:
            print(f"   - 准备删除 {len(lines_to_delete)} 条规则...")
            remote_lines = remote_content.splitlines()
            # 使用列表推导式过滤掉需要删除的行
            kept_lines = [line for line in remote_lines if line.strip() not in lines_to_delete]
            content_after_delete = "\n".join(kept_lines)
            # 在某些情况下，原始文件可能没有以换行符结尾，join后需要手动补上
            if remote_content.endswith('\n'):
                 content_after_delete += '\n'

        # 6. 执行添加/替换操作 (在删除后的内容上操作)
        customized_content = content_after_delete.replace(PLACEHOLDER, add_rules)
        
        if PLACEHOLDER not in content_after_delete:
            print(f"   [警告] 在 {remote_filename} 中未找到占位符 '{PLACEHOLDER}'。将把本地规则追加到文件末尾。")
            customized_content = content_after_delete.strip() + "\n\n" + add_rules

        # 7. 保存处理后的文件
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

    local_files = [f for f in os.listdir(LOCAL_RULES_DIR) if f.endswith(".txt")]
    
    if not local_files:
        print("在 'local' 目录中未找到任何 .txt 规则文件。")
        
    for filename in local_files:
        process_module(filename)
    
    print("--- 脚本执行完毕 ---")

if __name__ == "__main__":
    main()
