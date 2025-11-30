import os
import requests
import sys

# --- 配置 ---
BASE_URL = "https://raw.githubusercontent.com/SouthAlley/ke/main/Surge/"
LOCAL_RULES_DIR = "Surge/Module/local"
OUTPUT_DIR = "Surge/Module"
PLACEHOLDER = "#!!<CUSTOM_RULES>!!#"
DELETE_MARKER = "[DELETE]"
REPLACE_MARKER = "[REPLACE]"

def parse_local_content(local_content):
    """
    解析本地文件内容，健壮地分离出添加、删除和替换的部分。
    无论标记是否存在、顺序如何，都能正确处理。
    """
    add_rules_str = ""
    delete_str = ""
    replace_str = ""

    # 查找标记的位置
    delete_pos = local_content.find(DELETE_MARKER)
    replace_pos = local_content.find(REPLACE_MARKER)

    # 基于标记是否存在和它们的相对位置来分割内容
    markers = []
    if delete_pos != -1:
        markers.append((delete_pos, DELETE_MARKER))
    if replace_pos != -1:
        markers.append((replace_pos, REPLACE_MARKER))
    
    # 按标记出现的位置排序
    markers.sort()

    last_pos = 0
    if not markers:
        # 如果没有标记，整个文件都是添加内容
        add_rules_str = local_content
    else:
        # 第一个标记之前的内容是添加内容
        first_marker_pos = markers[0][0]
        add_rules_str = local_content[:first_marker_pos]
        
        # 遍历所有标记，提取它们之间的内容
        for i, (pos, marker) in enumerate(markers):
            start = pos + len(marker)
            end = markers[i+1][0] if i + 1 < len(markers) else len(local_content)
            
            chunk = local_content[start:end]
            
            if marker == DELETE_MARKER:
                delete_str += chunk
            elif marker == REPLACE_MARKER:
                replace_str += chunk
    
    # 清理和格式化提取出的字符串
    add_rules = add_rules_str.strip()
    delete_keywords = [kw.strip() for kw in delete_str.strip().splitlines() if kw.strip()]
    replace_rules = []
    for line in replace_str.strip().splitlines():
        if '=>' in line:
            parts = [x.strip() for x in line.split('=>', 1)]
            if len(parts) == 2 and parts[0]:
                replace_rules.append((parts[0], parts[1]))
                
    return add_rules, delete_keywords, replace_rules


def process_module(local_filename):
    """
    下载、处理（删除、替换、添加）并保存单个模块文件。
    """
    try:
        # 1. 构造文件名和路径
        base_name = os.path.splitext(local_filename)[0]
        remote_filename = f"{base_name}.sgmodule"
        download_url = f"{BASE_URL}{remote_filename}"
        local_rule_path = os.path.join(LOCAL_RULES_DIR, local_filename)
        output_path = os.path.join(OUTPUT_DIR, remote_filename)
        
        print(f"-> 开始处理模块: {base_name}")
        
        # 2. 下载远程模块
        response = requests.get(download_url)
        response.raise_for_status() 
        remote_content = response.text
        
        # 3. 读取并解析本地自定义文件
        with open(local_rule_path, 'r', encoding='utf-8') as f:
            local_content = f.read()
        add_rules, delete_keywords, replace_rules = parse_local_content(local_content)

        current_content_lines = remote_content.splitlines()

        # 4. 执行删除操作 (优先级最高)
        if delete_keywords:
            print(f"   - 根据 {len(delete_keywords)} 个关键词执行删除...")
            lines_after_delete = []
            for line in current_content_lines:
                should_delete = any(keyword in line for keyword in delete_keywords)
                if not should_delete:
                    lines_after_delete.append(line)
            current_content_lines = lines_after_delete

        # 5. 执行替换操作 (在删除后的内容上操作)
        if replace_rules:
            print(f"   - 根据 {len(replace_rules)} 条规则执行替换...")
            lines_after_replace = []
            for line in current_content_lines:
                is_replaced = False
                for find, replace_with in replace_rules:
                    if find in line:
                        lines_after_replace.append(replace_with)
                        is_replaced = True
                        break # 一行只被替换一次
                if not is_replaced:
                    lines_after_replace.append(line)
            current_content_lines = lines_after_replace
        
        content_after_modify = "\n".join(current_content_lines)
        if remote_content.endswith('\n') and not content_after_modify.endswith('\n'):
            content_after_modify += '\n'

        # 6. 执行占位符添加操作 (优先级最低)
        customized_content = content_after_modify
        if add_rules:
            if PLACEHOLDER in content_after_modify:
                print(f"   - 替换占位符 '{PLACEHOLDER}'...")
                customized_content = content_after_modify.replace(PLACEHOLDER, add_rules)
            else:
                print(f"   [警告] 未找到占位符 '{PLACEHOLDER}'，将把自定义规则追加到末尾。")
                customized_content = content_after_modify.strip() + "\n\n" + add_rules

        # 7. 保存文件
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(customized_content)
        print(f"   [成功] 已生成定制化模块: {output_path}")

    except requests.exceptions.RequestException as e:
        print(f"   [错误] 下载 {download_url} 失败: {e}", file=sys.stderr)
    except FileNotFoundError:
        print(f"   [错误] 本地规则文件未找到: {local_path}", file=sys.stderr)
    except Exception as e:
        print(f"   [错误] 处理 {local_filename} 时发生未知错误: {e}", file=sys.stderr)

def main():
    """ 脚本主入口 """
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
