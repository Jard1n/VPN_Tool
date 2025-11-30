import os
import requests
import sys
import re

# --- 配置 ---
BASE_URL = "https://raw.githubusercontent.com/SouthAlley/ke/main/Surge/"
LOCAL_RULES_DIR = "Surge/Module/local"
OUTPUT_DIR = "Surge/Module"
PLACEHOLDER = "#!!<CUSTOM_RULES>!!#"
DELETE_MARKER = "[DELETE]"
REPLACE_MARKER = "[REPLACE]"
INSERT_MARKER_RE = re.compile(r'\[INSERT\s+(BEFORE|AFTER)\s+"([^"]+)"\]')
END_INSERT_MARKER = "[END INSERT]"

def parse_local_content(local_content):
    """
    解析本地文件，分离出添加、删除、替换和插入的部分。
    """
    # 初始化
    add_rules_str = local_content
    delete_str = ""
    replace_str = ""
    insert_rules = [] # 格式: [('BEFORE'|'AFTER', 'anchor', 'content'), ...]

    # 1. 提取所有 [INSERT] 块
    while True:
        match = INSERT_MARKER_RE.search(add_rules_str)
        if not match:
            break
        
        start_pos = match.start()
        end_marker_pos = add_rules_str.find(END_INSERT_MARKER, match.end())
        if end_marker_pos == -1:
            break # 缺少结束标记，停止解析

        # 提取插入规则信息
        position = match.group(1) # BEFORE or AFTER
        anchor = match.group(2)
        content_to_insert = add_rules_str[match.end():end_marker_pos].strip()
        insert_rules.append((position, anchor, content_to_insert))
        
        # 从主字符串中移除这个 [INSERT] 块，以便后续处理
        add_rules_str = add_rules_str[:start_pos] + add_rules_str[end_marker_pos + len(END_INSERT_MARKER):]

    # 2. 从剩余部分提取 [DELETE] 和 [REPLACE] 块
    if DELETE_MARKER in add_rules_str:
        parts = add_rules_str.split(DELETE_MARKER, 1)
        add_rules_str = parts[0]
        delete_str = parts[1]
    
    if REPLACE_MARKER in delete_str:
        parts = delete_str.split(REPLACE_MARKER, 1)
        delete_str = parts[0]
        replace_str = parts[1]
    elif REPLACE_MARKER in add_rules_str:
        parts = add_rules_str.split(REPLACE_MARKER, 1)
        add_rules_str = parts[0]
        replace_str = parts[1]

    # 3. 格式化提取出的数据
    add_rules = add_rules_str.strip()
    delete_keywords = [kw.strip() for kw in delete_str.strip().splitlines() if kw.strip()]
    replace_rules = []
    for line in replace_str.strip().splitlines():
        if '=>' in line:
            parts = [x.strip() for x in line.split('=>', 1)]
            if len(parts) == 2 and parts[0]:
                replace_rules.append((parts[0], parts[1]))
                
    return add_rules, delete_keywords, replace_rules, insert_rules


def process_module(local_filename):
    """
    下载、处理（删除、替换、插入、添加）并保存模块。
    """
    try:
        # 步骤 1 & 2: 构造路径并下载远程模块 (不变)
        base_name = os.path.splitext(local_filename)[0]
        remote_filename = f"{base_name}.sgmodule"
        download_url = f"{BASE_URL}{remote_filename}"
        local_rule_path = os.path.join(LOCAL_RULES_DIR, local_filename)
        output_path = os.path.join(OUTPUT_DIR, remote_filename)
        
        print(f"-> 开始处理模块: {base_name}")
        response = requests.get(download_url)
        response.raise_for_status() 
        remote_content = response.text
        
        # 步骤 3: 读取并解析本地文件
        with open(local_rule_path, 'r', encoding='utf-8') as f:
            local_content = f.read()
        add_rules, delete_keywords, replace_rules, insert_rules = parse_local_content(local_content)

        current_content_lines = remote_content.splitlines()

        # 步骤 4: 执行删除 (优先级最高)
        if delete_keywords:
            print(f"   - 根据 {len(delete_keywords)} 个关键词执行删除...")
            lines_after_delete = [line for line in current_content_lines if not any(kw in line for kw in delete_keywords)]
            current_content_lines = lines_after_delete

        # 步骤 5: 执行替换
        if replace_rules:
            print(f"   - 根据 {len(replace_rules)} 条规则执行替换...")
            lines_after_replace = []
            for line in current_content_lines:
                replaced = False
                for find, replace_with in replace_rules:
                    if find in line:
                        lines_after_replace.append(replace_with)
                        replaced = True
                        break
                if not replaced:
                    lines_after_replace.append(line)
            current_content_lines = lines_after_replace
        
        # 步骤 6: 执行插入
        if insert_rules:
            print(f"   - 根据 {len(insert_rules)} 条规则执行插入...")
            # 按顺序执行插入，每次都在上一次操作的结果上进行
            for position, anchor, content_to_insert in insert_rules:
                new_lines = []
                anchor_found = False
                for i, line in enumerate(current_content_lines):
                    if not anchor_found and anchor in line:
                        anchor_found = True
                        if position == 'BEFORE':
                            new_lines.append(content_to_insert)
                            new_lines.append(line)
                        else: # AFTER
                            new_lines.append(line)
                            new_lines.append(content_to_insert)
                    else:
                        new_lines.append(line)
                
                if anchor_found:
                    current_content_lines = new_lines
                else:
                    print(f"   [警告] 未找到插入锚点 '{anchor}'，该插入操作被跳过。")

        content_after_modify = "\n".join(current_content_lines)
        if remote_content.endswith('\n') and not content_after_modify.endswith('\n'):
            content_after_modify += '\n'

        # 步骤 7: 执行占位符添加 (优先级最低)
        customized_content = content_after_modify
        if add_rules:
            if PLACEHOLDER in content_after_modify:
                print(f"   - 替换占位符 '{PLACEHOLDER}'...")
                customized_content = content_after_modify.replace(PLACEHOLDER, add_rules)
            else:
                print(f"   [警告] 未找到占位符 '{PLACEHOLDER}'，将把默认规则追加到末尾。")
                customized_content = content_after_modify.strip() + "\n\n" + add_rules

        # 步骤 8: 保存文件
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
    """ 脚本主入口 """
    # (此函数无需修改)
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
