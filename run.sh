#!/bin/bash
export LANG=en_US.UTF-8
export uuid=${UUID:-''}
export vl_port=${PORT:-''}

if [ -f "app.js" ]; then
  echo "检测到本地已有 app.js，直接运行..."
else
  echo "未检测到 app.js，开始下载..."
  wget -q https://raw.githubusercontent.com/ahhfzwl/node.js/main/app.js -O app.js
  wget -q https://raw.githubusercontent.com/ahhfzwl/node.js/main/package.json -O package.json
  sed -i "s/('UUID', '')/('UUID', '$uuid')/g" "app.js"
  sed -i "s/('PORT', '')/('PORT', '$vl_port')/g" "app.js"
fi

npm start
