#!/bin/bash

# 设置颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取域名的实时SHA1
get_cert_sha1() {
    local domain=$1
    local sha1=$(echo | openssl s_client -connect $domain:443 -servername $domain 2>/dev/null | 
                openssl x509 -fingerprint -sha1 -noout | 
                cut -d'=' -f2 | 
                tr -d ':' | 
                tr '[:upper:]' '[:lower:]')
    echo $sha1
}

# 获取JSON文件中存储的SHA1
get_stored_sha1() {
    local json_file=$1
    if [ -f "$json_file" ]; then
        local sha1=$(cat "$json_file" | grep -o '"sha1": *"[^"]*"' | cut -d'"' -f4)
        echo $sha1
    else
        echo ""
    fi
}

# 主验证逻辑
echo "开始验证证书SHA1..."
echo "----------------------------------------"

while IFS= read -r domain || [ -n "$domain" ]; do
    # 去除行尾空白字符
    domain=$(echo "$domain" | tr -d '[:space:]')
    [ -z "$domain" ] && continue
    
    echo "验证域名: $domain"
    
    # 获取实时SHA1
    current_sha1=$(get_cert_sha1 "$domain")
    if [ -z "$current_sha1" ]; then
        echo -e "${RED}错误: 无法获取 $domain 的证书${NC}"
        echo "----------------------------------------"
        continue
    fi
    
    # 获取存储的SHA1
    json_file="${domain}.json"
    stored_sha1=$(get_stored_sha1 "$json_file")
    if [ -z "$stored_sha1" ]; then
        echo -e "${RED}错误: 无法读取 $json_file${NC}"
        echo "----------------------------------------"
        continue
    fi
    
    # 对比SHA1值
    echo "存储的 SHA1: $stored_sha1"
    echo "当前的 SHA1: $current_sha1"
    
    if [ "$stored_sha1" = "$current_sha1" ]; then
        echo -e "${GREEN}验证通过: SHA1匹配${NC}"
    else
        echo -e "${RED}验证失败: SHA1不匹配${NC}"
    fi
    echo "----------------------------------------"
done < "domains.txt"

echo "验证完成" 